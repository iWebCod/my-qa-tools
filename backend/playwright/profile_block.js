const { createSession, screenshotOnError, closeSession } = require('./base');
module.exports = async function profile_block({ config, params, log }) {
  const { browser, page } = await createSession({ config, log });
  try {
    log('info', 'Сценарий: profile block');
    log('warn', 'Сценарий в разработке — требует настройки селекторов под ваш стенд');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle' });
    return { stub: true, scenario: 'profile_block' };
  } catch (err) { await screenshotOnError(page, log); throw err; }
  finally { await closeSession(browser); }
};
