/**
 * HTML Report Exporter
 * Exports reports to HTML format with embedded CSS
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseReportExporter } from './IReportExporter.js';
import type { Report, ExportResult } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';
import { HTMLRenderer } from '../utils/HTMLRenderer.js';

export class HTMLExporter extends BaseReportExporter {
  readonly format = 'HTML';
  readonly mimeType = 'text/html';
  readonly extension = 'html';
  readonly supports = ['text', 'images', 'charts', 'tables', 'interactive', 'styling'];

  constructor(private renderer: HTMLRenderer = new HTMLRenderer()) {
    super();
  }

  async export(report: Report, template: ReportTemplate): Promise<ExportResult> {
    const htmlContent = await this.generateHTMLContent(report, template);

    const filename = this.generateFilename(report);
    const filepath = path.join('/tmp', filename);

    await fs.writeFile(filepath, htmlContent, 'utf-8');

    return {
      format: this.format.toLowerCase(),
      path: filepath,
      size: Buffer.byteLength(htmlContent, 'utf-8'),
      mimeType: this.mimeType,
      filename,
      html: htmlContent,
      css: this.renderer.getStyles(),
    };
  }

  private async generateHTMLContent(report: Report, template: ReportTemplate): Promise<string> {
    return this.renderer.render(report, template);
  }
}
