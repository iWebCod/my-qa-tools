const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getConfig } = require('./config');

// Playwright scenario runners
const scenarios = {
  'org.create': require('../playwright/org_create'),
  'user.create': require('../playwright/user_create'),
  'user.block': require('../playwright/user_block'),
  'user.unblock': require('../playwright/user_unblock'),
  'user.reset_password': require('../playwright/user_reset_password'),
  'user.export': require('../playwright/user_export'),
  'profile.block': require('../playwright/profile_block'),
  'profile.unblock': require('../playwright/profile_unblock'),
  'profile.assign_role': require('../playwright/profile_assign_role'),
  'profile.remove_role': require('../playwright/profile_remove_role'),
  'ticket.create': require('../playwright/ticket_create'),
  'ticket.approve': require('../playwright/ticket_approve'),
  'ticket.reject': require('../playwright/ticket_reject'),
  'org.export': require('../playwright/org_export'),
  'profile.export': require('../playwright/profile_export'),
  'ticket.export': require('../playwright/ticket_export'),
  'user.register_authorized': require('../playwright/user_register_authorized'),
};

// Active runs
const runs = new Map();
const runBrowsers = new Map();
const runCancelers = new Map();

function nowIso() {
  return new Date().toISOString();
}

function extractParams(body) {
  if (!body || typeof body !== 'object') return {};
  if (body.params && typeof body.params === 'object') return body.params;
  return body;
}

function emitRunStatus(run) {
  global.broadcast({ type: 'run_status', ...run });
}

function updateRun(runId, patch) {
  const prev = runs.get(runId);
  if (!prev) return null;
  const next = { ...prev, ...patch };
  runs.set(runId, next);
  emitRunStatus(next);
  return next;
}

global.registerRunBrowser = (runId, browser) => {
  if (runId && browser) runBrowsers.set(runId, browser);
};

global.unregisterRunBrowser = (runId) => {
  if (runId) runBrowsers.delete(runId);
};

global.registerRunCanceler = (runId, cancelFn) => {
  if (runId && typeof cancelFn === 'function') runCancelers.set(runId, cancelFn);
};

global.unregisterRunCanceler = (runId) => {
  if (runId) runCancelers.delete(runId);
};

router.post('/stop/:runId', async (req, res) => {
  const { runId } = req.params;
  const run = runs.get(runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  if (!['queued', 'running', 'stopping'].includes(run.status)) {
    return res.status(409).json({ error: `Run is already ${run.status}` });
  }

  updateRun(runId, {
    status: 'stopping',
    stopRequested: true,
    stoppingAt: nowIso(),
  });

  global.broadcast({
    type: 'log',
    runId,
    scenario: run.scenario,
    level: 'warn',
    message: '■ Запрошена остановка сценария...',
    ts: nowIso(),
  });

  const browser = runBrowsers.get(runId);
  if (browser) {
    try {
      await browser.close();
    } catch (_) {
      // ignore close errors
    }
  }

  const cancel = runCancelers.get(runId);
  if (cancel) {
    try {
      cancel();
    } catch (_) {
      // ignore cancel errors
    }
  }

  res.json({ ok: true, runId, status: 'stopping' });
});

router.post('/:scenario', async (req, res) => {
  const { scenario } = req.params;
  const runner = scenarios[scenario];

  if (!runner) {
    return res.status(404).json({ error: `Unknown scenario: ${scenario}` });
  }

  const config = getConfig();
  if (!config.baseUrl) {
    return res.status(400).json({ error: 'Base URL не настроен. Заполните настройки подключения.' });
  }

  const runId = uuidv4();
  const params = extractParams(req.body);

  const queuedRun = {
    runId,
    scenario,
    status: 'queued',
    params,
    stopRequested: false,
    queuedAt: nowIso(),
    startedAt: null,
    finishedAt: null,
    error: null,
  };

  runs.set(runId, queuedRun);
  emitRunStatus(queuedRun);

  res.json({ runId });

  updateRun(runId, {
    status: 'running',
    startedAt: nowIso(),
  });

  // Run async, stream logs via WS
  const log = (level, message, data = null) => {
    const entry = { runId, scenario, level, message, data, ts: nowIso() };
    global.broadcast({ type: 'log', ...entry });
  };

  try {
    log('info', `▶ Запуск сценария: ${scenario}`);
    const result = await runner({ config, params, log, runId });
    const run = runs.get(runId);

    if (run?.stopRequested) {
      updateRun(runId, {
        status: 'stopped',
        finishedAt: nowIso(),
      });
      log('warn', '■ Сценарий остановлен пользователем');
      global.broadcast({ type: 'done', runId, scenario, status: 'stopped' });
      return;
    }

    updateRun(runId, {
      status: 'success',
      finishedAt: nowIso(),
      result,
    });
    log('success', '✓ Сценарий завершён успешно', result);
    global.broadcast({ type: 'done', runId, scenario, status: 'success', result });
  } catch (err) {
    const run = runs.get(runId);
    if (run?.stopRequested) {
      updateRun(runId, {
        status: 'stopped',
        finishedAt: nowIso(),
      });
      log('warn', '■ Сценарий остановлен пользователем');
      global.broadcast({ type: 'done', runId, scenario, status: 'stopped' });
      return;
    }

    updateRun(runId, {
      status: 'error',
      finishedAt: nowIso(),
      error: err.message,
    });
    log('error', `✗ Ошибка: ${err.message}`);
    global.broadcast({ type: 'done', runId, scenario, status: 'error', error: err.message });
  } finally {
    runBrowsers.delete(runId);
    runCancelers.delete(runId);
  }
});

router.get('/status/:runId', (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

module.exports = router;
