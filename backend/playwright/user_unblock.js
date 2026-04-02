const { createSession, screenshotOnError, closeSession } = require('./base');
module.exports = async function user_unblock({ config, params, log, runId }) {
  const { browser, page } = await createSession({ config, log, runId });
  try {
    log('info', `Ищем пользователя: ${params.login}`);
    await page.goto(`${config.baseUrl}/users`, { waitUntil: 'networkidle' });
    await page.locator('input[type="search"], input[placeholder*="Поиск"]').first().fill(params.login);
    await page.waitForTimeout(800);
    await page.locator('tr, .user-row').filter({ hasText: params.login }).first().click();
    log('info', `Нажимаем "Разблокировать"...`);
    await page.locator('button:has-text("Разблокировать"), [data-action="unblock"]').first().click();
    await page.locator('button[type="submit"], button:has-text("Подтвердить")').last().click();
    await page.waitForTimeout(1000);
    log('success', `Пользователь ${params.login} разблокирован`);
    return { unblocked: true, login: params.login };
  } catch (err) { await screenshotOnError(page, log); throw err; }
  finally { await closeSession(browser, runId); }
};

