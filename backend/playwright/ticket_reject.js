const { createSession, screenshotOnError, closeSession } = require('./base');
module.exports = async function ticket_reject({ config, params, log }) {
  const { browser, page } = await createSession({ config, log });
  try {
    log('info', 'Сценарий: ticket reject');
    log('warn', 'Сценарий в разработке — требует настройки селекторов под ваш стенд');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle' });
    return { stub: true, scenario: 'ticket_reject' };
  } catch (err) { await screenshotOnError(page, log); throw err; }
  finally { await closeSession(browser); }
};
