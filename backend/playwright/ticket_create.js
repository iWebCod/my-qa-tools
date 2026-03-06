const { createSession, screenshotOnError, closeSession } = require('./base');
module.exports = async function ticket_create({ config, params, log, runId }) {
  const { browser, page } = await createSession({ config, log, runId });
  try {
    log('info', 'Сценарий: ticket create');
    log('warn', 'Сценарий в разработке — требует настройки селекторов под ваш стенд');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle' });
    return { stub: true, scenario: 'ticket_create' };
  } catch (err) { await screenshotOnError(page, log); throw err; }
  finally { await closeSession(browser); }
};

