const { createSession, screenshotOnError, closeSession } = require('./base');
module.exports = async function user_reset_password({ config, params, log, runId }) {
  const { browser, page } = await createSession({ config, log, runId });
  try {
    log('info', `Ищем пользователя: ${params.login}`);
    await page.goto(`${config.baseUrl}/users`, { waitUntil: 'networkidle' });
    await page.locator('input[type="search"], input[placeholder*="Поиск"]').first().fill(params.login);
    await page.waitForTimeout(800);
    await page.locator('tr, .user-row').filter({ hasText: params.login }).first().click();
    log('info', `Сброс пароля с запретом входа по старому...`);
    await page.locator('button:has-text("Сбросить пароль"), [data-action="reset-password"]').first().click();
    await page.locator('button[type="submit"], button:has-text("Подтвердить")').last().click();
    await page.waitForTimeout(1000);
    log('success', `Пароль пользователя ${params.login} сброшен`);
    return { reset: true, login: params.login };
  } catch (err) { await screenshotOnError(page, log); throw err; }
  finally { await closeSession(browser); }
};

