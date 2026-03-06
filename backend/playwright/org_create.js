const http = require('http');
const https = require('https');

const ORG_TYPE_LABELS = {
  juristic: 'ЮЛ',
  individual_entrepreneur: 'ИП',
  farming: 'КФХ',
  separate_juristic: 'ОП',
  self_employed: 'ФЛ',
  not_defined: 'НО',
};

function normalizeOrgType(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return 'juristic';

  const aliases = {
    'юл': 'juristic',
    'ип': 'individual_entrepreneur',
    'кфх': 'farming',
    'оп': 'separate_juristic',
    'фл': 'self_employed',
    'но': 'not_defined',
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

function postJson(urlString, payload, { timeoutMs = 30000, runId = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const data = JSON.stringify(payload);

    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: timeoutMs,
      ...(isHttps ? { rejectUnauthorized: false } : {}),
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (runId && typeof global.unregisterRunCanceler === 'function') {
          global.unregisterRunCanceler(runId);
        }

        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch (_) {
          parsed = body;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data: parsed });
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

    req.write(data);
    req.end();
  });
}

/**
 * Scenario: Create Organization via backend API (no UI login)
 * Params: { name, shortName, inn, ogrn, kpp, type, address, registrationDate, isActive, organizationApiUrl }
 */
module.exports = async function org_create({ config, params, log, runId }) {
  const normalizedType = normalizeOrgType(params.type);
  const typeLabel = ORG_TYPE_LABELS[normalizedType] || normalizedType;
  const registrationDate = normalizeDate(params.registrationDate);

  if (!params.name) {
    throw new Error('Поле "Полное наименование" обязательно');
  }
  if (!params.inn) {
    throw new Error('Поле "ИНН" обязательно');
  }

  const endpoint = resolveOrgApiUrl(config, params);
  const payload = {
    items: [
      {
        fullName: params.name,
        shortName: params.shortName || params.name,
        type: normalizedType,
        inn: String(params.inn),
        ogrn: params.ogrn ? String(params.ogrn) : undefined,
        kpp: params.kpp ? String(params.kpp) : undefined,
        address: params.address || '',
        registrationDate: registrationDate || undefined,
        isActive: params.isActive !== false,
      },
    ],
  };

  // Remove undefined keys in item
  payload.items[0] = Object.fromEntries(Object.entries(payload.items[0]).filter(([, v]) => v !== undefined));

  log('info', `Создание организации через API: ${endpoint}`);
  log('info', `Тип: ${typeLabel} (${normalizedType})`);
  log('info', `ИНН: ${payload.items[0].inn}`);

  const response = await postJson(endpoint, payload, { timeoutMs: 45000, runId });

  log('success', `Организация отправлена в API (HTTP ${response.statusCode})`);
  return {
    created: true,
    endpoint,
    statusCode: response.statusCode,
    request: payload,
    response: response.data,
  };
};


