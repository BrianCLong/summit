import { chromium } from 'playwright';
import * as fs from 'fs';
(async () => {
  const base = process.env.APP_BASE_URL || 'http://localhost:5173';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const paths = ['/', '/settings', '/projects', '/exports'];
  const catalog: Record<string, string[]> = {};
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    const texts = await page.$$eval('body *', (els) =>
      els
        .map((el) => ({
          t: (el as HTMLElement).innerText?.trim() || '',
          a: el.getAttribute('aria-label') || '',
        }))
        .filter((x) => (x.t && x.t.length < 200) || x.a)
        .map((x) => x.a || x.t),
    );
    catalog[p] = Array.from(new Set(texts.filter(Boolean)));
  }
  fs.mkdirSync('docs/ops/ui', { recursive: true });
  fs.writeFileSync(
    'docs/ops/ui/ui-catalog.json',
    JSON.stringify({ base, catalog }, null, 2),
  );
  await browser.close();
})();
