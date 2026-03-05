const { chromium } = require('playwright');

/**
 * Creates an authenticated browser session for XIDBOX
 * Returns { browser, page } — caller must close browser when done
 */
async function createSession({ config, log, headless = true }) {
  log('info', `Запуск браузера → ${config.baseUrl}`);

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Intercept console errors from the page
  page.on('console', msg => {
    if (msg.type() === 'error') {
      log('warn', `[browser] ${msg.text()}`);
    }
  });

  log('info', `Открываем страницу входа...`);
  await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle' });

  // Fill login form
  log('info', `Вводим учётные данные: ${config.login}`);
  await page.fill('input[name="login"], input[type="text"]', config.login);
  await page.fill('input[name="password"], input[type="password"]', config.password);
  await page.click('button[type="submit"]');

  // Wait for redirect after login
  await page.waitForURL(url => !url.includes('/login'), { timeout: 10000 });
  log('success', `Авторизация успешна`);

  return { browser, page, context };
}

/**
 * Take screenshot on error for debugging
 */
async function screenshotOnError(page, log) {
  try {
    const screenshot = await page.screenshot({ type: 'png' });
    const base64 = screenshot.toString('base64');
    log('debug', 'screenshot', { base64, mime: 'image/png' });
  } catch (e) {
    // ignore
  }
}

/**
 * Safely close browser
 */
async function closeSession(browser) {
  try { await browser.close(); } catch (e) { /* ignore */ }
}

module.exports = { createSession, screenshotOnError, closeSession };
