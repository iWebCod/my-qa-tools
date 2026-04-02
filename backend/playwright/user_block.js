const { createSession, screenshotOnError, closeSession } = require('./base');

async function findUser(page, config, identifier, log) {
  await page.goto(`${config.baseUrl}/users`, { waitUntil: 'networkidle' });
  const searchField = page.locator('input[placeholder*="Поиск"], input[placeholder*="поиск"], input[type="search"]').first();
  await searchField.fill(identifier);
  await page.waitForTimeout(800);
  const userRow = page.locator('tr, [data-row], .user-row').filter({ hasText: identifier }).first();
  await userRow.click();
  await page.waitForTimeout(500);
}

// user_block.js
module.exports = async function user_block({ config, params, log, runId }) {
  const { browser, page } = await createSession({ config, log, runId });
  try {
    log('info', `Ищем пользователя: ${params.login}`);
    await findUser(page, config, params.login, log);
    log('info', `Нажимаем "Заблокировать"...`);
    await page.locator('button:has-text("Заблокировать"), [data-action="block"]').first().click();
    if (params.blockType === 'permanent') {
      await page.locator('label:has-text("Бессрочная"), input[value="permanent"]').first().click().catch(() => {});
    }
    if (params.reason) {
      await page.fill('textarea, input[name="reason"]', params.reason).catch(() => {});
    }
    await page.locator('button[type="submit"], button:has-text("Подтвердить"), button:has-text("Заблокировать")').last().click();
    await page.waitForTimeout(1000);
    log('success', `Пользователь ${params.login} заблокирован`);
    return { blocked: true, login: params.login };
  } catch (err) {
    await screenshotOnError(page, log);
    throw err;
  } finally {
    await closeSession(browser, runId);
  }
};

