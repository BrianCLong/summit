/**
 * JSON Report Exporter
 * Exports reports to JSON format for programmatic access
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseReportExporter } from './IReportExporter.js';
import type { Report, ExportResult, ReportMetadata } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';

export class JSONExporter extends BaseReportExporter {
  readonly format = 'JSON';
  readonly mimeType = 'application/json';
  readonly extension = 'json';
  readonly supports = ['data', 'structured'];

  async export(report: Report, template: ReportTemplate): Promise<ExportResult> {
    const jsonData = this.buildJSONData(report, template);
    const jsonContent = JSON.stringify(jsonData, null, 2);

    const filename = this.generateFilename(report);
    const filepath = path.join('/tmp', filename);

    await fs.writeFile(filepath, jsonContent, 'utf-8');

    return {
      format: this.format.toLowerCase(),
      path: filepath,
      size: Buffer.byteLength(jsonContent, 'utf-8'),
      mimeType: this.mimeType,
      filename,
      json: jsonContent,
    };
  }

  private buildJSONData(report: Report, template: ReportTemplate) {
    const metadata: ReportMetadata = {
      reportId: report.id,
      templateId: report.templateId,
      generatedAt: new Date(),
      generatedBy: report.requestedBy,
      parameters: report.parameters,
    };

    return {
      metadata,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
      },
      sections: report.sections.map((section) => ({
        name: section.name,
        title: section.title,
        data: section.data,
        generatedAt: section.generatedAt,
      })),
      executionTime: report.executionTime,
      status: report.status,
    };
  }
}
