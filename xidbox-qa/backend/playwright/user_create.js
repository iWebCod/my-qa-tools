const { createSession, screenshotOnError, closeSession } = require('./base');

/**
 * Scenario: Create User (registration by authorized person)
 * Params: { login, email, lastName, firstName, middleName, password, organizationId, organizationName }
 */
module.exports = async function user_create({ config, params, log }) {
  const { browser, page } = await createSession({ config, log });

  try {
    log('info', `Переходим к списку пользователей...`);
    await page.goto(`${config.baseUrl}/users`, { waitUntil: 'networkidle' });

    log('info', `Нажимаем "Создать пользователя"...`);
    const createBtn = page.locator('button:has-text("Создать"), button:has-text("Регистрация"), button:has-text("Добавить"), [data-testid="create-user"]').first();
    await createBtn.click();

    await page.waitForTimeout(500);

    log('info', `Заполняем форму пользователя...`);

    if (params.lastName) {
      await page.fill('input[name="lastName"], [placeholder*="Фамилия"]', params.lastName);
    }
    if (params.firstName) {
      await page.fill('input[name="firstName"], [placeholder*="Имя"]', params.firstName);
    }
    if (params.middleName) {
      await page.fill('input[name="middleName"], [placeholder*="Отчество"]', params.middleName);
    }
    if (params.login) {
      await page.fill('input[name="login"], [placeholder*="Логин"], [placeholder*="login"]', params.login);
      log('info', `Логин: ${params.login}`);
    }
    if (params.email) {
      await page.fill('input[name="email"], input[type="email"], [placeholder*="Email"], [placeholder*="email"]', params.email);
      log('info', `Email: ${params.email}`);
    }
    if (params.password) {
      const pwdFields = page.locator('input[name="password"], input[type="password"]');
      const count = await pwdFields.count();
      if (count >= 1) await pwdFields.nth(0).fill(params.password);
      if (count >= 2) await pwdFields.nth(1).fill(params.password); // confirm
    }

    // Select organization if provided
    if (params.organizationName) {
      log('info', `Выбираем организацию: ${params.organizationName}`);
      const orgField = page.locator('[placeholder*="организац"], [name*="organization"], [name*="org"]').first();
      await orgField.fill(params.organizationName);
      await page.waitForTimeout(500);
      // Click first dropdown option
      const option = page.locator('[role="option"], .dropdown-item, li').filter({ hasText: params.organizationName }).first();
      await option.click().catch(() => log('warn', 'Не удалось выбрать организацию из dropdown'));
    }

    log('info', `Сохраняем пользователя...`);
    const saveBtn = page.locator('button[type="submit"], button:has-text("Сохранить"), button:has-text("Создать"), button:has-text("Зарегистрировать")').last();
    await saveBtn.click();

    await page.waitForTimeout(1500);

    const successMsg = await page.locator('.success, [class*="success"], [data-status="success"]').first().textContent({ timeout: 3000 }).catch(() => null);

    log('success', successMsg || `Пользователь "${params.login || params.email}" создан`);

    return { created: true, login: params.login, email: params.email };

  } catch (err) {
    await screenshotOnError(page, log);
    throw err;
  } finally {
    await closeSession(browser);
  }
};
