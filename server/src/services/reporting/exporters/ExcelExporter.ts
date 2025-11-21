/**
 * Excel Report Exporter
 * Exports reports to Microsoft Excel format
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseReportExporter } from './IReportExporter.js';
import type { Report, ExportResult } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';

export class ExcelExporter extends BaseReportExporter {
  readonly format = 'EXCEL';
  readonly mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  readonly extension = 'xlsx';
  readonly supports = ['data', 'charts', 'multiple_sheets', 'formatting'];

  async export(report: Report, template: ReportTemplate): Promise<ExportResult> {
    // In a full implementation, this would use ExcelJS or similar
    const content = this.generateExcelContent(report, template);

    const filename = this.generateFilename(report);
    const filepath = path.join('/tmp', filename);

    await fs.writeFile(filepath, content);

    return {
      format: 'xlsx',
      path: filepath,
      size: Buffer.byteLength(content),
      mimeType: this.mimeType,
      filename,
      buffer: Buffer.from(content),
    };
  }

  private generateExcelContent(report: Report, template: ReportTemplate): string {
    // Extract tabular data and convert to CSV-like format
    // A real implementation would use exceljs
    const entities = report.data?.entities || [];
    const headers = entities.length > 0 ? Object.keys(entities[0]) : ['No data'];
    const rows = entities.map((e: any) => Object.values(e).join('\t'));

    return [headers.join('\t'), ...rows].join('\n');
  }
}
