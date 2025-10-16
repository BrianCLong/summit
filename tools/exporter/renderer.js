import fs from 'fs/promises';
import puppeteer from 'puppeteer';

export async function render({
  url,
  out,
  landscape = false,
  format = 'A4',
  headerPath,
  footerPath,
}) {
  const args = process.env.CI ? ['--no-sandbox'] : [];
  const browser = await puppeteer.launch({ headless: 'new', args });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });

    if (out.endsWith('.png')) {
      await page.screenshot({ path: out, fullPage: true });
      return;
    }

    const headerTemplate = headerPath
      ? await fs.readFile(headerPath, 'utf8')
      : '<span></span>';
    const footerTemplate = footerPath
      ? await fs.readFile(footerPath, 'utf8')
      : '<span></span>';

    await page.pdf({
      path: out,
      landscape,
      format,
      printBackground: true,
      displayHeaderFooter: Boolean(headerPath || footerPath),
      headerTemplate,
      footerTemplate,
      margin: {
        top: headerPath ? '48px' : '20px',
        bottom: footerPath ? '48px' : '20px',
        left: '12mm',
        right: '12mm',
      },
    });
  } finally {
    await browser.close();
  }
}
