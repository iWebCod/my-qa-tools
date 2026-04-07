/**
 * Общие HTTP-хелперы для сценариев (без браузера).
 * Поддерживают отмену через global.registerRunCanceler / unregisterRunCanceler.
 */
const http  = require('http');
const https = require('https');

function makeRequest(urlString, method, payload, { extraHeaders = {}, timeoutMs = 30000, runId = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const data = payload !== undefined ? JSON.stringify(payload) : null;

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extraHeaders,
    };
    if (data !== null) headers['Content-Length'] = Buffer.byteLength(data);

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers,
      timeout: timeoutMs,
      ...(isHttps ? { rejectUnauthorized: false } : {}),
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (runId && typeof global.unregisterRunCanceler === 'function') {
          global.unregisterRunCanceler(runId);
        }
        let parsed = null;
        try { parsed = body ? JSON.parse(body) : null; } catch (_) { parsed = body; }
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
    req.on('timeout', () => req.destroy(new Error(`API timeout after ${timeoutMs}ms`)));

    if (runId && typeof global.registerRunCanceler === 'function') {
      global.registerRunCanceler(runId, () => req.destroy(new Error('Aborted by user')));
    }

    if (data !== null) req.write(data);
    req.end();
  });
}

function postJson(urlString, payload, opts) {
  return makeRequest(urlString, 'POST', payload, opts);
}

function getJson(urlString, opts) {
  return makeRequest(urlString, 'GET', undefined, opts);
}

module.exports = { postJson, getJson };
