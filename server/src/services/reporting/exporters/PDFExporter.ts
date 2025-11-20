/**
 * PDF Report Exporter
 * Exports reports to PDF format using Puppeteer
 */

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { BaseReportExporter } from './IReportExporter.js';
import type { Report, ExportResult } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';
import { HTMLRenderer } from '../utils/HTMLRenderer.js';

export class PDFExporter extends BaseReportExporter {
  readonly format = 'PDF';
  readonly mimeType = 'application/pdf';
  readonly extension = 'pdf';
  readonly supports = ['text', 'images', 'charts', 'tables', 'styling'];

  constructor(
    private renderer: HTMLRenderer = new HTMLRenderer(),
    private puppeteerOptions: any = { headless: true },
  ) {
    super();
  }

  async export(report: Report, template: ReportTemplate): Promise<ExportResult> {
    const browser = await puppeteer.launch(this.puppeteerOptions);

    try {
      const page = await browser.newPage();

      // Generate HTML content
      const htmlContent = this.renderer.render(report, template);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Add PDF-specific styles
      await page.addStyleTag({
        content: this.getPDFStyles(),
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          bottom: '1in',
          left: '0.75in',
          right: '0.75in',
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `,
      });

      const filename = this.generateFilename(report);
      const filepath = path.join('/tmp', filename);

      await fs.writeFile(filepath, pdfBuffer);

      return {
        format: this.format.toLowerCase(),
        path: filepath,
        size: pdfBuffer.length,
        mimeType: this.mimeType,
        filename,
        buffer: pdfBuffer,
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Get PDF-specific styles
   */
  private getPDFStyles(): string {
    return `
      @page {
        margin: 1in 0.75in;
        size: A4;
      }

      body {
        font-size: 11pt;
      }

      .report-section {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      h1 {
        page-break-after: avoid;
      }

      h2 {
        page-break-after: avoid;
      }

      table {
        page-break-inside: avoid;
      }

      @media print {
        .no-print {
          display: none;
        }
      }
    `;
  }
}
