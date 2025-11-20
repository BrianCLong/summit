import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import _ from 'lodash';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ReportOptions {
  title: string;
  description?: string;
  generatedAt: string;
  reportId: string;
  items: Record<string, any>[];
  [key: string]: any; // Allow extra properties
}

export class ReportService {
  private templateCache: Record<string, (data: any) => string> = {};

  async generatePDF(data: ReportOptions, templateName: string = 'default'): Promise<Buffer> {
    const html = await this.renderTemplate(data, templateName);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '20px'
        }
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private async renderTemplate(data: ReportOptions, templateName: string): Promise<string> {
    if (!this.templateCache[templateName]) {
       // Check if template exists
       const templatePath = path.resolve(__dirname, `templates/${templateName}.html`);
       try {
         const templateContent = await fs.readFile(templatePath, 'utf-8');
         this.templateCache[templateName] = _.template(templateContent);
       } catch (error) {
         throw new Error(`Template ${templateName} not found at ${templatePath}`);
       }
    }

    return this.templateCache[templateName](data);
  }
}
