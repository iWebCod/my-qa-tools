const express = require('express');
const router = express.Router();

// In-memory config (per session)
let config = {
  baseUrl: '',
  login: '',
  password: '',
  organizationApiUrl: '',
};

router.get('/', (req, res) => {
  res.json({
    baseUrl: config.baseUrl,
    login: config.login,
    organizationApiUrl: config.organizationApiUrl,
  });
});

router.post('/', (req, res) => {
  const { baseUrl, login, password, organizationApiUrl } = req.body;
  if (typeof baseUrl === 'string' && baseUrl.trim()) config.baseUrl = baseUrl.replace(/\/$/, '');
  if (typeof login === 'string' && login.trim()) config.login = login;
  if (typeof password === 'string' && password.trim()) config.password = password;
  if (typeof organizationApiUrl === 'string') config.organizationApiUrl = organizationApiUrl.replace(/\/$/, '');
  res.json({ ok: true });
});

router.get('/get', (req, res) => {
  res.json({
    baseUrl: config.baseUrl,
    login: config.login,
    organizationApiUrl: config.organizationApiUrl,
    hasPassword: Boolean(config.password),
  });
});

module.exports = router;
module.exports.getConfig = () => config;
