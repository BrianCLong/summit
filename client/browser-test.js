import { chromium } from 'playwright';

(async () => {
  console.log('🧪 Starting browser test...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'],
  });

  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} BROWSER CONSOLE [${type}]: ${text}`);
  });

  // Listen for errors
  page.on('pageerror', (error) => {
    console.error('❌ PAGE ERROR:', error.message);
  });

  // Navigate to the app
  console.log('🌐 Navigating to http://localhost:3000...');

  try {
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 10000,
    });

    console.log('✅ Page loaded successfully');

    // Wait a moment for JavaScript to execute
    await page.waitForTimeout(3000);

    // Check if content was rendered
    const rootContent = await page.locator('#root').innerHTML();
    console.log('📍 Root element content length:', rootContent.length);

    if (rootContent.length > 0) {
      console.log('✅ SUCCESS: Content was rendered!');
      console.log(
        '📍 Root content preview:',
        rootContent.substring(0, 200) + '...',
      );
    } else {
      console.log('❌ FAILURE: Root element is empty');

      // Get the full HTML for debugging
      const fullHtml = await page.content();
      console.log('📍 Full HTML length:', fullHtml.length);

      // Check for any errors in the network tab
      const response = await page.goto('http://localhost:3000');
      console.log('📍 Response status:', response.status());
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('📸 Screenshot saved as debug-screenshot.png');
  } catch (error) {
    console.error('❌ Navigation failed:', error.message);
  }

  await browser.close();
  console.log('🧪 Browser test completed');
})();
