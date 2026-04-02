const express = require('express');
const router = express.Router();

// In-memory config (per session)
let config = {
  baseUrl: '',
  login: '',
  password: '',
  organizationApiUrl: '',
  maxRuns: 200,
};

router.get('/', (req, res) => {
  res.json({
    baseUrl: config.baseUrl,
    login: config.login,
    organizationApiUrl: config.organizationApiUrl,
  });
});

router.post('/', (req, res) => {
  const { baseUrl, login, password, organizationApiUrl, maxRuns } = req.body;
  if (typeof baseUrl === 'string' && baseUrl.trim()) config.baseUrl = baseUrl.replace(/\/$/, '');
  if (typeof login === 'string' && login.trim()) config.login = login;
  if (typeof password === 'string' && password.trim()) config.password = password;
  if (typeof organizationApiUrl === 'string') config.organizationApiUrl = organizationApiUrl.replace(/\/$/, '');
  if (typeof maxRuns === 'number' && maxRuns >= 10) config.maxRuns = Math.min(1000, maxRuns);
  res.json({ ok: true });
});

router.get('/get', (req, res) => {
  res.json({
    baseUrl: config.baseUrl,
    login: config.login,
    organizationApiUrl: config.organizationApiUrl,
    hasPassword: Boolean(config.password),
    maxRuns: config.maxRuns,
  });
});

module.exports = router;
module.exports.getConfig = () => config;
