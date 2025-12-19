import { chromium, Browser, Page } from 'playwright';
import fs from 'fs-extra';
import path from 'path';

let browser: Browser | null = null;

export interface RenderOptions {
  format?: 'Letter' | 'A4';
  printBackground?: boolean;
  margin?: { top: string; right: string; bottom: string; left: string };
  timeout?: number;
  redaction?: boolean;
}

export async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
  }
  return browser;
}

export async function renderPdf(html: string, options: RenderOptions = {}): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set timeout
  page.setDefaultTimeout(options.timeout || 30000);

  try {
    // Block external resources
    await page.route('**', (route) => {
      const url = route.request().url();
      if (url.startsWith('http') && !url.includes('localhost')) {
        return route.abort();
      }
      return route.continue();
    });

    await page.setContent(html, { waitUntil: 'networkidle' });

    // Redaction logic: mask elements with .redact class
    if (options.redaction) {
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `
          .redact {
            color: transparent !important;
            background: black !important;
            user-select: none !important;
          }
        `;
        document.head.appendChild(style);

        // ensure text is removed from accessibility tree if possible,
        // or just covered. The vector rectangle approach is simulated by CSS background.
        // For true redaction, we might need more aggressive DOM manipulation.
        document.querySelectorAll('.redact').forEach(el => {
           el.innerHTML = ''; // aggressive removal
           (el as HTMLElement).style.backgroundColor = 'black';
           (el as HTMLElement).style.width = '100%';
           (el as HTMLElement).style.height = '1em'; // approximated
           (el as HTMLElement).style.display = 'inline-block';
        });
      });
    }

    const pdfBuffer = await page.pdf({
      format: options.format || 'Letter',
      printBackground: options.printBackground ?? true,
      margin: options.margin,
      preferCSSPageSize: true,
    });

    return pdfBuffer;
  } finally {
    await page.close();
    await context.close();
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
