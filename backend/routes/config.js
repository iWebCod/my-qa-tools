const express = require('express');
const router = express.Router();

// In-memory config (per session)
let config = {
  baseUrl: '',
  login: '',
  password: ''
};

router.get('/', (req, res) => {
  res.json({ baseUrl: config.baseUrl, login: config.login });
});

router.post('/', (req, res) => {
  const { baseUrl, login, password } = req.body;
  if (baseUrl) config.baseUrl = baseUrl.replace(/\/$/, '');
  if (login) config.login = login;
  if (password) config.password = password;
  res.json({ ok: true });
});

router.get('/get', () => config);

module.exports = router;
module.exports.getConfig = () => config;
