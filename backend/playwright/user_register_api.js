/**
 * Сценарий: Регистрация пользователя через API (без браузера)
 * Два шага:
 *   1. POST /frontbackend/api/v1/users/registration/via/order/sign-data → получаем signData
 *   2. POST /frontbackend/api/v1/users/registration/via/order → создаём заявку
 *
 * Параметры:
 *   params.orgUuid       — UUID организации из БД (organizationId)
 *   params.orgInn        — ИНН организации (для лога)
 *   params.firstName     — Имя
 *   params.lastName      — Фамилия
 *   params.middleName    — Отчество
 *   params.inn           — ИНН физ. лица (12 цифр)
 *   params.snils         — СНИЛС (11 цифр)
 *   params.birthday      — Дата рождения YYYY-MM-DD
 *   params.login         — Логин
 *   params.personalEmail — Личный email
 *   params.workEmail     — Рабочий email (по умолчанию = personalEmail)
 *
 * Конфиг:
 *   config.profileUuid   — UUID профиля уполномоченного (x-idbox-user-profile-uuid)
 *   config.baseUrl       — базовый URL XIDBOX
 */
const { postJson } = require('./helpers/http');

function normalizeBirthday(value) {
  const s = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}


module.exports = async function userRegisterApi({ config, params, log, runId }) {
  const profileUuid = String(config.profileUuid || '').trim();
  const authToken   = String(config.authToken   || '').trim();
  const apiBase     = String(config.apiBaseUrl || config.baseUrl || '').replace(/\/$/, '');

  if (!profileUuid) throw new Error('Не задан profileUuid в настройках окружения');
  if (!apiBase)     throw new Error('Не задан baseUrl или apiBaseUrl в настройках окружения');

  const {
    orgUuid       = '',
    orgInn        = '',
    firstName     = '',
    lastName      = '',
    middleName    = '',
    inn           = '',
    snils         = '',
    birthday      = '',
    login         = '',
    personalEmail = '',
    workEmail     = '',
  } = params;

  if (!orgUuid)    throw new Error('Не задан UUID организации (orgUuid)');
  if (!lastName)   throw new Error('Не задана фамилия');
  if (!login)      throw new Error('Не задан логин');

  const birthdayNorm = normalizeBirthday(birthday);
  const email = personalEmail || workEmail;
  const wEmail = workEmail || personalEmail;

  const personData = {
    firstName,
    lastName,
    middleName,
    inn,
    snils,
    birthday: birthdayNorm,
    login,
    email,
    workEmail: wEmail,
    organizationId: orgUuid,
    securityPolicyAccepted: true,
  };

  const headers = {
    'x-idbox-user-profile-uuid': profileUuid,
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
  };

  log('info', `Регистрация пользователя через API`);
  log('info', `Орг. UUID: ${orgUuid}${orgInn ? ` (ИНН: ${orgInn})` : ''}`);
  log('info', `Пользователь: ${lastName} ${firstName} ${middleName}, логин: ${login}`);
  log('info', `ИНН: ${inn}, СНИЛС: ${snils}, дата рождения: ${birthdayNorm}`);

  // Шаг 1: получение подписанных данных
  const signDataUrl = `${apiBase}/frontbackend/api/v1/users/registration/via/order/sign-data`;
  log('info', `Шаг 1: ${signDataUrl}`);

  const signRes = await postJson(signDataUrl, { data: personData }, { extraHeaders: headers, timeoutMs: 30000, runId });
  const normalizedData = signRes.data?.text || signRes.data?.signData?.normalizedData || '';
  const sign           = signRes.data?.base64 || signRes.data?.signData?.sign || '';

  log('info', `Шаг 1 завершён (HTTP ${signRes.statusCode}), подпись получена`);

  // Шаг 2: создание заявки на регистрацию
  const orderUrl = `${apiBase}/frontbackend/api/v1/users/registration/via/order`;
  log('info', `Шаг 2: ${orderUrl}`);

  const orderRes = await postJson(orderUrl, {
    data: personData,
    signData: { normalizedData, sign },
  }, { extraHeaders: headers, timeoutMs: 30000, runId });

  log('success', `✓ Пользователь ${lastName} ${firstName} (${login}) зарегистрирован (HTTP ${orderRes.statusCode})`);

  return {
    login,
    orgUuid,
    orgInn,
    response: orderRes.data,
  };
};
