const http = require('http');
const https = require('https');
const { postJson, getJson } = require('./helpers/http');

const ORG_TYPE_LABELS = {
  juristic: 'UL',
  individual_entrepreneur: 'IP',
  farming: 'KFH',
  separate_juristic: 'OP',
  self_employed: 'FL',
  not_defined: 'NO',
};

function normalizeOrgType(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return 'juristic';

  const aliases = {
    '\u044e\u043b': 'juristic',
    '\u0438\u043f': 'individual_entrepreneur',
    '\u043a\u0444\u0445': 'farming',
    '\u043e\u043f': 'separate_juristic',
    '\u0444\u043b': 'self_employed',
    '\u043d\u043e': 'not_defined',
  };

  return aliases[raw] || raw;
}

function normalizeDate(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return raw;
}

function supportsKpp(type) {
  return type === 'juristic' || type === 'separate_juristic';
}

function supportsOgrn(type) {
  return type === 'juristic' || type === 'individual_entrepreneur' || type === 'farming';
}

function usesInn12(type) {
  return type === 'individual_entrepreneur' || type === 'farming' || type === 'self_employed';
}

function isDigits(value, length) {
  return new RegExp(`^\\d{${length}}$`).test(String(value || ''));
}

function validInn10(inn) {
  if (!isDigits(inn, 10)) return false;
  const d = String(inn).split('').map(Number);
  const w = [2, 4, 10, 3, 5, 9, 4, 6, 8];
  const c = (d.slice(0, 9).reduce((sum, x, i) => sum + x * w[i], 0) % 11) % 10;
  return c === d[9];
}

function validInn12(inn) {
  if (!isDigits(inn, 12)) return false;
  const d = String(inn).split('').map(Number);
  const w1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
  const w2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
  const c1 = (d.slice(0, 10).reduce((sum, x, i) => sum + x * w1[i], 0) % 11) % 10;
  const c2 = (d.slice(0, 11).reduce((sum, x, i) => sum + x * w2[i], 0) % 11) % 10;
  return c1 === d[10] && c2 === d[11];
}

function validKpp(kpp) {
  return isDigits(kpp, 9);
}

function validOgrn13(ogrn) {
  if (!isDigits(ogrn, 13)) return false;
  const base = BigInt(String(ogrn).slice(0, 12));
  const check = Number(base % 11n % 10n);
  return check === Number(String(ogrn).slice(12));
}

function validOgrnip15(ogrn) {
  if (!isDigits(ogrn, 15)) return false;
  const base = BigInt(String(ogrn).slice(0, 14));
  const check = Number(base % 13n % 10n);
  return check === Number(String(ogrn).slice(14));
}

function resolveOrgApiUrl(config, params) {
  const custom = String(params.organizationApiUrl || config.organizationApiUrl || '').trim();
  const defaultPath = '/organization/api/v1/organizations';

  if (!custom) {
    return new URL(defaultPath, config.baseUrl).toString();
  }

  const parsed = new URL(custom);
  if (!parsed.pathname || parsed.pathname === '/') {
    parsed.pathname = defaultPath;
  }
  return parsed.toString();
}

function resolveOrgLookupApiUrl(config, params) {
  const custom = String(params.organizationLookupApiUrl || config.organizationLookupApiUrl || '').trim();
  const defaultBase = 'http://10.22.255.77:8080';
  const defaultPath = '/database/api/v1/organizations/by-inn-kpp-ogrn';

  if (!custom) {
    return new URL(defaultPath, defaultBase).toString();
  }

  const parsed = new URL(custom);
  if (!parsed.pathname || parsed.pathname === '/') {
    parsed.pathname = defaultPath;
  }
  return parsed.toString();
}

function resolveOrgReportApiUrl(config, params) {
  const custom = String(params.organizationReportApiUrl || config.organizationReportApiUrl || '').trim();
  const defaultPath = '/organization/api/v1/organizations/report';
  const base = String(params.organizationApiUrl || config.organizationApiUrl || '').trim() || config.baseUrl;

  if (!custom) {
    return new URL(defaultPath, base).toString();
  }

  const parsed = new URL(custom);
  if (!parsed.pathname || parsed.pathname === '/') {
    parsed.pathname = defaultPath;
  }
  return parsed.toString();
}


function getRaw(urlString, { timeoutMs = 30000, runId = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        Accept: '*/*',
      },
      timeout: timeoutMs,
      ...(isHttps ? { rejectUnauthorized: false } : {}),
    };

    const req = client.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        if (runId && typeof global.unregisterRunCanceler === 'function') {
          global.unregisterRunCanceler(runId);
        }

        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch (_) {
          parsed = raw;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data: parsed, raw, headers: res.headers });
          return;
        }

        const msg = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        reject(new Error(`API ${res.statusCode}: ${msg || 'unknown error'}`));
      });
    });

    req.on('error', (err) => {
      if (runId && typeof global.unregisterRunCanceler === 'function') {
        global.unregisterRunCanceler(runId);
      }
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy(new Error(`API timeout after ${timeoutMs}ms`));
    });

    if (runId && typeof global.registerRunCanceler === 'function') {
      global.registerRunCanceler(runId, () => req.destroy(new Error('Aborted by user')));
    }

    req.end();
  });
}

function buildOrgLookupUrl(baseUrl, payloadItem) {
  const url = new URL(baseUrl);
  url.searchParams.set('inn', String(payloadItem.inn || ''));
  return url.toString();
}

function buildOrgReportUrl(baseUrl, orderUuid) {
  const url = new URL(baseUrl);
  url.searchParams.set('orderUuid', String(orderUuid || ''));
  return url.toString();
}

function toTimestamp(value) {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : 0;
}

function pickCreatedOrganization(items, payloadItem) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;

  const byInn = list.filter((it) => String(it?.inn || '') === String(payloadItem.inn || ''));
  const byFullMatch = byInn.filter((it) => {
    const kppOk = payloadItem.kpp ? String(it?.kpp || '') === String(payloadItem.kpp) : true;
    const ogrnOk = payloadItem.ogrn ? String(it?.ogrn || '') === String(payloadItem.ogrn) : true;
    return kppOk && ogrnOk;
  });

  const pool = byFullMatch.length ? byFullMatch : (byInn.length ? byInn : list);
  return [...pool].sort((a, b) => toTimestamp(b?.createDate) - toTimestamp(a?.createDate))[0] || null;
}

function pickOrganizationFromReport(reportData, payloadItem) {
  const data = reportData && typeof reportData === 'object' ? reportData : null;
  if (!data) return null;

  const buckets = [];
  for (const key of ['created', 'duplicates', 'invalid']) {
    if (Array.isArray(data[key])) buckets.push(...data[key]);
  }

  const items = buckets
    .map((row) => (row && typeof row === 'object' ? row.item : null))
    .filter(Boolean);

  if (!items.length) return null;

  const byInn = items.filter((it) => String(it?.inn || '') === String(payloadItem.inn || ''));
  const byFullMatch = byInn.filter((it) => {
    const kppOk = payloadItem.kpp ? String(it?.kpp || '') === String(payloadItem.kpp) : true;
    const ogrnOk = payloadItem.ogrn ? String(it?.ogrn || '') === String(payloadItem.ogrn) : true;
    return kppOk && ogrnOk;
  });

  const pool = byFullMatch.length ? byFullMatch : (byInn.length ? byInn : items);
  return pool.find((it) => it?.uuid) || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scenario: Create Organization via backend API (no UI login)
 * Params: { name, shortName, inn, ogrn, kpp, type, address, registrationDate, isActive, organizationApiUrl }
 */
module.exports = async function org_create({ config, params, log, runId }) {
  const normalizedType = normalizeOrgType(params.type);
  const typeLabel = ORG_TYPE_LABELS[normalizedType] || normalizedType;
  const registrationDate = normalizeDate(params.registrationDate);
  const inn = String(params.inn || '').trim();
  const kpp = String(params.kpp || '').trim();
  const ogrn = String(params.ogrn || '').trim();

  if (!params.name) {
    throw new Error('Field "Full name" is required');
  }
  if (!inn) {
    throw new Error('Field "INN" is required');
  }
  if (usesInn12(normalizedType)) {
    if (!validInn12(inn)) throw new Error('Invalid INN: expected valid 12 digits for selected type');
  } else if (!validInn10(inn)) {
    throw new Error('Invalid INN: expected valid 10 digits');
  }
  if (supportsKpp(normalizedType) && kpp && !validKpp(kpp)) {
    throw new Error('Invalid KPP: expected 9 digits');
  }
  if (supportsOgrn(normalizedType) && ogrn) {
    const ogrnOk = (normalizedType === 'individual_entrepreneur' || normalizedType === 'farming') ? validOgrnip15(ogrn) : validOgrn13(ogrn);
    if (!ogrnOk) throw new Error('Invalid OGRN/OGRNIP for selected type');
  }

  const payloadItem = {
    fullName: params.name,
    shortName: params.shortName || params.name,
    type: normalizedType,
    inn,
    address: params.address || '',
    registrationDate: registrationDate || undefined,
    isActive: params.isActive !== false,
  };

  if (supportsKpp(normalizedType) && kpp) {
    payloadItem.kpp = kpp;
  }

  if (supportsOgrn(normalizedType) && ogrn) {
    payloadItem.ogrn = ogrn;
  }

  const endpoint = resolveOrgApiUrl(config, params);
  const payload = {
    items: [Object.fromEntries(Object.entries(payloadItem).filter(([, value]) => value !== undefined))],
  };

  log('info', `Creating organization via API: ${endpoint}`);
  log('info', `Type: ${typeLabel} (${normalizedType})`);
  log('info', `INN: ${payload.items[0].inn}`);

  const response = await postJson(endpoint, payload, { timeoutMs: 45000, runId });
  log('success', `Organization request accepted by API (HTTP ${response.statusCode})`);

  const lookupBaseUrl = resolveOrgLookupApiUrl(config, params);
  const lookupUrl = buildOrgLookupUrl(lookupBaseUrl, payload.items[0]);
  const orderUuid = response?.data?.orderUuid ? String(response.data.orderUuid) : null;
  const orderKey = response?.data?.key ? String(response.data.key) : null;
  const reportBaseUrl = resolveOrgReportApiUrl(config, params);
  const reportUrl = orderUuid ? buildOrgReportUrl(reportBaseUrl, orderUuid) : null;
  const rawDelay = Number(params.organizationLookupDelayMs);
  const lookupDelayMs = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 3000;

  log('info', `Waiting ${lookupDelayMs}ms before UUID lookup`);
  await sleep(lookupDelayMs);

  let uuid = null;
  let uuidSource = null;
  let foundOrganization = null;
  let lookupStatusCode = null;
  let lookupAttempts = 0;
  let reportStatusCode = null;
  let reportOrganization = null;
  const rawAttempts = Number(params.organizationLookupMaxAttempts);
  const maxLookupAttempts = Number.isFinite(rawAttempts) ? Math.max(1, Math.min(120, Math.floor(rawAttempts))) : 40;
  const rawRetryDelay = Number(params.organizationLookupRetryDelayMs);
  const lookupRetryDelayMs = Number.isFinite(rawRetryDelay) ? Math.max(500, rawRetryDelay) : 3000;

  log('info', `Searching UUID in DB: ${lookupUrl}`);
  if (reportUrl) {
    log('info', `Order report fallback enabled: ${reportUrl}`);
  }
  for (let attempt = 1; attempt <= maxLookupAttempts; attempt += 1) {
    lookupAttempts = attempt;
    try {
      const lookupResponse = await getJson(lookupUrl, { timeoutMs: 30000, runId });
      lookupStatusCode = lookupResponse.statusCode;
      foundOrganization = pickCreatedOrganization(lookupResponse.data, payload.items[0]);
      uuid = foundOrganization?.uuid || null;

      if (uuid) {
        uuidSource = 'db_lookup';
        log('success', `UUID found: ${uuid} (attempt ${attempt}/${maxLookupAttempts})`);
        break;
      }
    } catch (lookupErr) {
      if (attempt < maxLookupAttempts) {
        log('warn', `Lookup error (${attempt}/${maxLookupAttempts}): ${lookupErr.message}`);
      } else {
        log('warn', `Failed to fetch UUID from DB: ${lookupErr.message}`);
      }
    }

    if (!uuid && reportUrl) {
      try {
        const reportResponse = await getRaw(reportUrl, { timeoutMs: 30000, runId });
        reportStatusCode = reportResponse.statusCode;
        reportOrganization = pickOrganizationFromReport(reportResponse.data, payload.items[0]);
        if (reportOrganization?.uuid) {
          uuid = String(reportOrganization.uuid);
          uuidSource = 'order_report';
          log('success', `UUID found in order report: ${uuid} (attempt ${attempt}/${maxLookupAttempts})`);
          break;
        }
      } catch (reportErr) {
        if (attempt < maxLookupAttempts) {
          log('warn', `Order report error (${attempt}/${maxLookupAttempts}): ${reportErr.message}`);
        } else {
          log('warn', `Failed to fetch UUID from order report: ${reportErr.message}`);
        }
      }
    }

    if (!uuid && attempt < maxLookupAttempts) {
      log('info', `UUID not found yet (${attempt}/${maxLookupAttempts}), retry in ${lookupRetryDelayMs}ms`);
      await sleep(lookupRetryDelayMs);
    }
  }

  if (!uuid) {
    log('warn', `UUID not found after ${lookupAttempts} attempts${orderUuid ? ` (orderUuid: ${orderUuid})` : ''}`);
  }

  return {
    created: true,
    endpoint,
    statusCode: response.statusCode,
    request: payload,
    response: response.data,
    uuid,
    uuidSource,
    order: {
      orderUuid,
      key: orderKey,
    },
    lookup: {
      endpoint: lookupUrl,
      statusCode: lookupStatusCode,
      attempts: lookupAttempts,
      organization: foundOrganization,
    },
    report: {
      endpoint: reportUrl,
      statusCode: reportStatusCode,
      organization: reportOrganization,
    },
  };
};
