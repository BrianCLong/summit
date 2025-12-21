import { PDFDocument, StandardFonts } from 'pdf-lib';
import puppeteer from 'puppeteer-core';

export type HtmlToPdfOptions = { executablePath?: string };

function htmlToPlainText(html: string) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function htmlToPdf(html: string, opts: HtmlToPdfOptions = {}): Promise<Buffer> {
  const htmlContent = html?.trim();
  if (!htmlContent) throw new Error('html_empty');
  const executablePath = opts.executablePath || process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;

  if (executablePath) {
    const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return Buffer.from(pdf);
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = htmlToPlainText(htmlContent);
  const wrapped = text.slice(0, 2000); // avoid unbounded pages
  page.drawText(wrapped, { x: 50, y: height - 50, size: 12, font, maxWidth: width - 100, lineHeight: 14 });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}
