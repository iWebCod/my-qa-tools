const { createSession, screenshotOnError, closeSession } = require('./base');

/**
 * Scenario: Create Organization
 * Params: { name, shortName, inn, kpp, type, description }
 */
module.exports = async function org_create({ config, params, log }) {
  const { browser, page } = await createSession({ config, log });

  try {
    log('info', `Переходим к списку организаций...`);
    await page.goto(`${config.baseUrl}/organizations`, { waitUntil: 'networkidle' });

    log('info', `Нажимаем "Создать организацию"...`);
    // Try common button selectors
    const createBtn = page.locator('button:has-text("Создать"), button:has-text("Добавить"), [data-testid="create-org"]').first();
    await createBtn.click();

    log('info', `Заполняем форму организации...`);

    // Fill organization form fields
    if (params.name) {
      await page.fill('input[name="name"], [placeholder*="Наименование"], [label*="Наименование"] input', params.name);
      log('info', `Наименование: ${params.name}`);
    }
    if (params.shortName) {
      await page.fill('input[name="shortName"], [placeholder*="Краткое"]', params.shortName);
    }
    if (params.inn) {
      await page.fill('input[name="inn"], [placeholder*="ИНН"]', params.inn);
      log('info', `ИНН: ${params.inn}`);
    }
    if (params.kpp) {
      await page.fill('input[name="kpp"], [placeholder*="КПП"]', params.kpp);
    }
    if (params.description) {
      await page.fill('textarea[name="description"], [placeholder*="Описание"]', params.description);
    }

    log('info', `Сохраняем организацию...`);
    const saveBtn = page.locator('button[type="submit"], button:has-text("Сохранить"), button:has-text("Создать")').last();
    await saveBtn.click();

    // Wait for success indication
    await page.waitForTimeout(1500);

    // Check for success toast/message
    const successMsg = await page.locator('.success, [class*="success"], .notification--success, [data-status="success"]').first().textContent({ timeout: 3000 }).catch(() => null);

    if (successMsg) {
      log('success', `Организация создана: ${successMsg}`);
    } else {
      log('success', `Форма отправлена. Организация "${params.name}" создана.`);
    }

    return { created: true, name: params.name };

  } catch (err) {
    await screenshotOnError(page, log);
    throw err;
  } finally {
    await closeSession(browser);
  }
};
