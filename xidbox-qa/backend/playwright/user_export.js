const { createSession, screenshotOnError, closeSession } = require('./base');
const path = require('path');
module.exports = async function user_export({ config, params, log }) {
  const { browser, page, context } = await createSession({ config, log });
  try {
    log('info', `Переходим к списку пользователей...`);
    await page.goto(`${config.baseUrl}/users`, { waitUntil: 'networkidle' });
    log('info', `Запускаем выгрузку...`);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("Выгрузить"), button:has-text("Экспорт"), [data-action="export"]').first().click()
    ]);
    const suggestedFilename = download.suggestedFilename();
    log('success', `Файл выгружен: ${suggestedFilename}`);
    return { exported: true, filename: suggestedFilename };
  } catch (err) { await screenshotOnError(page, log); throw err; }
  finally { await closeSession(browser); }
};
