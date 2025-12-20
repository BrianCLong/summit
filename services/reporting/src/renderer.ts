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
  locale?: string;
  timezone?: string;
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
  const context = await browser.newContext({
    locale: options.locale || 'en-US',
    timezoneId: options.timezone || 'UTC',
  });
  const page = await context.newPage();

  // Set timeout
  page.setDefaultTimeout(options.timeout || 30000);

  try {
    // Block external resources - Strict Allowlist
    await page.route('**', (route) => {
      const url = route.request().url();
      try {
        const u = new URL(url);

        // Allow local schemes
        if (['file:', 'data:', 'blob:', 'about:'].includes(u.protocol)) {
          return route.continue();
        }

        // Allow localhost for local API calls or assets
        if (['http:', 'https:'].includes(u.protocol)) {
           if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
             return route.continue();
           }
        }

        // Default deny
        console.warn(`Blocked external resource: ${url}`);
        return route.abort();
      } catch (e) {
        // Invalid URL -> Block
        return route.abort();
      }
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
            border: none !important;
          }
        `;
        document.head.appendChild(style);

        // Remove text content from accessibility tree but keep layout
        document.querySelectorAll('.redact').forEach(el => {
           el.setAttribute('aria-hidden', 'true');
           // We rely on CSS color:transparent to hide text.
           // The background:black creates the black box.
           // This preserves layout exactly.
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
