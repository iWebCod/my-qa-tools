const { createSession, screenshotOnError, closeSession } = require('./base');
module.exports = async function profile_export({ config, params, log }) {
  const { browser, page } = await createSession({ config, log });
  try {
    log('info', 'Сценарий: profile export');
    log('warn', 'Сценарий в разработке — требует настройки селекторов под ваш стенд');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle' });
    return { stub: true, scenario: 'profile_export' };
  } catch (err) { await screenshotOnError(page, log); throw err; }
  finally { await closeSession(browser); }
};
