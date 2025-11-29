/**
 * PDFRenderer - Renders briefing packages to PDF format using Puppeteer
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import type { RenderContext, RenderResult, ExportOptions } from '../types.js';
import { HTMLRenderer } from './HTMLRenderer.js';
import { TemplateEngine } from '../templates/TemplateEngine.js';

export interface PDFRenderOptions extends Partial<ExportOptions> {
  headerTemplate?: string;
  footerTemplate?: string;
  margins?: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  scale?: number;
  displayHeaderFooter?: boolean;
}

const defaultPDFOptions: PDFRenderOptions = {
  paperSize: 'A4',
  orientation: 'portrait',
  includeWatermark: false,
  includePageNumbers: true,
  includeTableOfContents: false,
  margins: {
    top: '1in',
    bottom: '1in',
    left: '0.75in',
    right: '0.75in',
  },
  scale: 1,
  displayHeaderFooter: true,
};

export class PDFRenderer {
  private readonly htmlRenderer: HTMLRenderer;
  private browser: Browser | null = null;

  constructor(templateEngine?: TemplateEngine) {
    this.htmlRenderer = new HTMLRenderer(templateEngine);
  }

  /**
   * Render briefing context to PDF
   */
  async render(
    context: RenderContext,
    templateId: string,
    options: PDFRenderOptions = {},
  ): Promise<RenderResult> {
    const opts = { ...defaultPDFOptions, ...options };

    // First render to HTML
    const htmlResult = await this.htmlRenderer.render(context, templateId, {
      sanitize: true,
      parseMarkdown: true,
      includeStyles: true,
    });

    let html = htmlResult.content as string;

    // Add watermark if requested
    if (opts.includeWatermark) {
      html = this.htmlRenderer.addWatermark(html, context.classificationLevel);
    }

    // Add table of contents if requested
    if (opts.includeTableOfContents) {
      html = this.htmlRenderer.addTableOfContents(html);
    }

    // Convert to PDF
    const pdfBuffer = await this.htmlToPdf(html, context, opts);

    const filename = this.generateFilename(context);

    return {
      content: pdfBuffer,
      format: 'pdf',
      mimeType: 'application/pdf',
      filename,
      metadata: {
        templateId,
        generatedAt: context.generatedAt,
        classificationLevel: context.classificationLevel,
        pageCount: await this.getPageCount(pdfBuffer),
      },
    };
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async htmlToPdf(
    html: string,
    context: RenderContext,
    options: PDFRenderOptions,
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Add PDF-specific styles
      await page.addStyleTag({
        content: this.getPDFStyles(),
      });

      const headerTemplate = options.headerTemplate || this.getDefaultHeader(context);
      const footerTemplate = options.footerTemplate || this.getDefaultFooter(context);

      const pdfBuffer = await page.pdf({
        format: options.paperSize || 'A4',
        landscape: options.orientation === 'landscape',
        printBackground: true,
        margin: options.margins,
        scale: options.scale,
        displayHeaderFooter: options.displayHeaderFooter,
        headerTemplate,
        footerTemplate,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Get or create browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Get default header template
   */
  private getDefaultHeader(context: RenderContext): string {
    return `
      <div style="
        font-size: 9px;
        width: 100%;
        text-align: center;
        padding: 10px 0;
        color: #666;
        border-bottom: 1px solid #ddd;
      ">
        <span style="font-weight: bold;">${context.classificationLevel}</span>
        ${context.sensitivityMarkings.length > 0 ? ' // ' + context.sensitivityMarkings.join(' // ') : ''}
      </div>
    `;
  }

  /**
   * Get default footer template
   */
  private getDefaultFooter(context: RenderContext): string {
    return `
      <div style="
        font-size: 9px;
        width: 100%;
        display: flex;
        justify-content: space-between;
        padding: 10px 20px;
        color: #666;
        border-top: 1px solid #ddd;
      ">
        <span>${context.title}</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span>${new Date(context.generatedAt).toLocaleDateString()}</span>
      </div>
    `;
  }

  /**
   * Get PDF-specific styles
   */
  private getPDFStyles(): string {
    return `
      @page {
        margin: 0;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .no-print {
          display: none !important;
        }

        .page-break {
          page-break-before: always;
        }

        .avoid-break {
          page-break-inside: avoid;
        }

        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
        }

        table, figure, img {
          page-break-inside: avoid;
        }
      }
    `;
  }

  /**
   * Generate filename for PDF
   */
  private generateFilename(context: RenderContext): string {
    const sanitizedTitle = context.title
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);

    const timestamp = new Date().toISOString().split('T')[0];

    return `${sanitizedTitle}_${timestamp}.pdf`;
  }

  /**
   * Get approximate page count from PDF buffer
   */
  private async getPageCount(pdfBuffer: Buffer): Promise<number> {
    // Simple page count estimation from PDF buffer
    const pdfString = pdfBuffer.toString('binary');
    const matches = pdfString.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 1;
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
