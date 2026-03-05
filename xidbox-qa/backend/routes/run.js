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
  runs.set(runId, { status: 'running', startedAt: new Date() });

  res.json({ runId });

  // Run async, stream logs via WS
  const log = (level, message, data = null) => {
    const entry = { runId, level, message, data, ts: new Date().toISOString() };
    global.broadcast({ type: 'log', ...entry });
  };

  try {
    log('info', `▶ Запуск сценария: ${scenario}`);
    const result = await runner({ config, params: req.body, log });
    runs.set(runId, { status: 'success', result });
    log('success', `✓ Сценарий завершён успешно`, result);
    global.broadcast({ type: 'done', runId, status: 'success', result });
  } catch (err) {
    runs.set(runId, { status: 'error', error: err.message });
    log('error', `✗ Ошибка: ${err.message}`);
    global.broadcast({ type: 'done', runId, status: 'error', error: err.message });
  }
});

router.get('/status/:runId', (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

module.exports = router;
