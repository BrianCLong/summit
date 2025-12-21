/**
 * PPTX Report Exporter
 * Generates briefing-ready PPTX decks with slide-per-section summaries
 */

import PptxGenJS from 'pptxgenjs';
import { promises as fs } from 'fs';
import path from 'path';
import { BaseReportExporter } from './IReportExporter.js';
import type { Report, ExportResult } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';

export class PPTXExporter extends BaseReportExporter {
  readonly format = 'PPTX';
  readonly mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  readonly extension = 'pptx';
  readonly supports = ['text', 'images', 'charts', 'tables', 'styling'];

  constructor(private readonly pptxFactory: () => PptxGenJS = () => new PptxGenJS()) {
    super();
  }

  async export(report: Report, template: ReportTemplate): Promise<ExportResult> {
    const pptx = this.pptxFactory();
    const title = this.getReportTitle(report, template);

    pptx.title = title;

    this.addTitleSlide(pptx, title, report);
    this.addSectionSlides(pptx, report);

    const output = await pptx.write({ outputType: 'nodebuffer' });
    const buffer = Buffer.isBuffer(output)
      ? output
      : Buffer.from(output as ArrayBuffer | Uint8Array | string);
    const filename = this.generateFilename(report);
    const filepath = path.join('/tmp', filename);

    await fs.writeFile(filepath, buffer);

    return {
      format: this.extension,
      path: filepath,
      size: buffer.length,
      mimeType: this.mimeType,
      filename,
      buffer,
    };
  }

  private addTitleSlide(pptx: PptxGenJS, title: string, report: Report): void {
    const slide = pptx.addSlide();
    slide.addText(title, {
      x: 0.5,
      y: 1,
      w: 9,
      h: 1.5,
      fontSize: 32,
      bold: true,
      color: '1F2937',
    });

    slide.addText(`Generated for ${report.requestedBy || 'Analyst'}`, {
      x: 0.5,
      y: 2.2,
      w: 9,
      fontSize: 18,
      color: '4B5563',
    });

    const generatedAt = report.createdAt
      ? new Date(report.createdAt).toISOString()
      : new Date().toISOString();

    slide.addText(`Created: ${generatedAt}`, {
      x: 0.5,
      y: 2.8,
      w: 9,
      fontSize: 14,
      color: '6B7280',
    });
  }

  private addSectionSlides(pptx: PptxGenJS, report: Report): void {
    report.sections.forEach((section, index) => {
      const slide = pptx.addSlide();
      const sectionTitle = section.title || section.name || `Section ${index + 1}`;
      slide.addText(sectionTitle, {
        x: 0.5,
        y: 0.6,
        w: 9,
        h: 0.6,
        fontSize: 24,
        bold: true,
        color: '111827',
      });

      const summary = this.buildSectionSummary(section.data);
      slide.addText(summary || 'No content available for this section.', {
        x: 0.5,
        y: 1.4,
        w: 9,
        h: 5,
        fontSize: 14,
        color: '1F2937',
        valign: 'top',
        wrap: true,
      });

      slide.addText(`Updated: ${section.generatedAt ? new Date(section.generatedAt).toISOString() : 'N/A'}`, {
        x: 0.5,
        y: 6.6,
        w: 9,
        fontSize: 12,
        color: '6B7280',
      });
    });
  }

  private buildSectionSummary(data: any): string {
    if (!data) {
      return '';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      return data
        .slice(0, 8)
        .map((item) => `• ${this.stringifyItem(item)}`)
        .join('\n');
    }

    return this.stringifyItem(data);
  }

  private stringifyItem(item: unknown): string {
    if (item === null || item === undefined) {
      return '';
    }

    if (typeof item === 'string') {
      return item;
    }

    if (typeof item === 'number' || typeof item === 'boolean') {
      return String(item);
    }

    try {
      const json = JSON.stringify(item, null, 2);
      return json.length > 800 ? `${json.slice(0, 797)}...` : json;
    } catch {
      return '[unserializable section content]';
    }
  }
}
