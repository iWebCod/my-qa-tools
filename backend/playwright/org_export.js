const { createSession, screenshotOnError, closeSession } = require('./base');
module.exports = async function org_export({ config, params, log, runId }) {
  const { browser, page } = await createSession({ config, log, runId });
  try {
    log('info', 'Сценарий: org export');
    log('warn', 'Сценарий в разработке — требует настройки селекторов под ваш стенд');
    await page.goto(config.baseUrl, { waitUntil: 'networkidle' });
    return { stub: true, scenario: 'org_export' };
  } catch (err) { await screenshotOnError(page, log); throw err; }
  finally { await closeSession(browser); }
};

