/**
 * Сценарий: Регистрация пользователя уполномоченным лицом
 * Источник: playwright codegen (реальные селекторы XIDBOX)
 *
 * Параметры:
 *   params.orgInn        — ИНН организации (10 цифр)
 *   params.lastName      — Фамилия
 *   params.firstName     — Имя
 *   params.middleName    — Отчество
 *   params.birthday      — Дата рождения DD.MM.YYYY
 *   params.inn           — ИНН физ. лица (12 цифр)
 *   params.snils         — СНИЛС (11 цифр, без пробелов и дефисов)
 *   params.login         — Логин
 *   params.personalEmail — Личный email
 *   params.workEmail     — Рабочий email
 *   params.orgUuid       — UUID организации из БД (для выбора в списке), по умолчанию первая
 */
const { createSession, screenshotOnError, closeSession } = require('./base');

module.exports = async function userRegisterAuthorized({ config, params, log, runId }) {
  const {
    orgInn        = '',
    lastName      = '',
    firstName     = '',
    middleName    = '',
    birthday      = '01.01.2000',
    inn           = '',
    snils         = '',
    login         = '',
    personalEmail = '',
    workEmail     = '',
    orgUuid       = '',   // если пусто — кликаем первый вариант в списке
  } = params;

  const { browser, page } = await createSession({ config, log, runId });

  try {
    // ── Выбор организации после логина ──────────────────────────────────
    log('info', 'Выбираем организацию...');
    if (orgUuid) {
      await page.locator(`[data-id="${orgUuid}"], [data-uuid="${orgUuid}"]`).first().click();
    } else {
      // кликнуть первый элемент списка организаций
      await page.locator('[data-test-id="org-item"], .org-item').first().click();
    }
    await page.getByRole('button', { name: 'Продолжить' }).click();

    // ── Навигация к разделу Пользователи ────────────────────────────────
    log('info', 'Открываем раздел Пользователи...');
    await page.locator('[data-test-id="burger"]').click();
    await page.getByRole('link', { name: 'Пользователи' }).click();
    await page.getByRole('button', { name: 'Зарегистрировать' }).click();

    // ── Шаг 1: Поиск организации по ИНН ─────────────────────────────────
    log('info', `Ищем организацию по ИНН: ${orgInn}`);
    await page.getByRole('textbox', { name: 'ИНН' }).fill(orgInn);
    await page.getByRole('button', { name: 'Найти организацию' }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    // ── Шаг 2: Личные данные ─────────────────────────────────────────────
    log('info', 'Заполняем личные данные...');
    await page.getByRole('textbox', { name: 'Фамилия' }).fill(lastName);
    await page.getByRole('textbox', { name: 'Имя' }).fill(firstName);
    await page.getByRole('textbox', { name: 'Отчество' }).fill(middleName);

    // Дата рождения через datepicker
    log('info', `Дата рождения: ${birthday}`);
    const [day, month, year] = birthday.split('.');
    const monthNames = ['январь','февраль','март','апрель','май','июнь',
                        'июль','август','сентябрь','октябрь','ноябрь','декабрь'];
    const monthName = monthNames[parseInt(month, 10) - 1];

    await page.getByRole('button', { name: 'Выберите дату' }).click();
    await page.getByRole('button', { name: /открыт календарный вид/ }).click();
    await page.getByRole('radio', { name: year }).click();
    await page.getByRole('radio', { name: monthName }).click();
    await page.getByRole('gridcell', { name: String(parseInt(day, 10)), exact: true }).click();

    // ИНН физ. лица
    log('info', `ИНН физ. лица: ${inn}`);
    const innField = page.getByRole('spinbutton', { name: 'ИНН' });
    await innField.click();
    await innField.fill(inn);

    // СНИЛС
    log('info', `СНИЛС: ${snils}`);
    const snilsField = page.getByRole('spinbutton', { name: 'СНИЛС' });
    await snilsField.click();
    await snilsField.fill(snils);

    // Логин
    log('info', `Логин: ${login}`);
    await page.getByRole('textbox', { name: 'Логин' }).fill(login);

    // Email
    log('info', 'Заполняем email...');
    await page.getByRole('textbox', { name: 'Личный email' }).fill(personalEmail);
    await page.getByRole('textbox', { name: 'Рабочий email' }).fill(workEmail);

    // Завершение
    await page.getByRole('button', { name: 'Добавить' }).click();
    await page.getByRole('button', { name: 'Подтвердить' }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    log('success', `✓ Пользователь ${lastName} ${firstName} (${login}) зарегистрирован`);
  } catch (err) {
    await screenshotOnError(page, log);
    log('error', `✗ Ошибка: ${err.message}`);
    throw err;
  } finally {
    await closeSession(browser, runId);
  }
};

