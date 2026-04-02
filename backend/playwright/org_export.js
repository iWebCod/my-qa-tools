const { createSession, screenshotOnError, closeSession } = require('./base');

module.exports = async function org_export({ config, params, log, runId }) {
  const { browser, page } = await createSession({ config, log, runId });
  try {
    log('info', 'Переходим к списку организаций...');
    await page.goto(`${config.baseUrl}/organizations`, { waitUntil: 'networkidle' });
    log('info', 'Запускаем выгрузку...');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("Выгрузить"), button:has-text("Экспорт"), [data-action="export"]').first().click()
    ]);
    const suggestedFilename = download.suggestedFilename();
    log('success', `Файл выгружен: ${suggestedFilename}`);
    return { exported: true, filename: suggestedFilename };
  } catch (err) { await screenshotOnError(page, log); throw err; }
  finally { await closeSession(browser, runId); }
};
