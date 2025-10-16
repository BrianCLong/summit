import { chromium } from 'playwright';
import * as fs from 'fs';
(async () => {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  const out = 'docs/ops/ui/shots';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const p of ['/', '/settings', '/projects']) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: `${out}${p.replace(/\//, '') || '/home'}.png`,
      fullPage: true,
    });
  }
  await browser.close();
})();
