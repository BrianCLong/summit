/**
 * CSV Report Exporter
 * Exports tabular report data to CSV format
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseReportExporter } from './IReportExporter.js';
import type { Report, ExportResult } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';

export class CSVExporter extends BaseReportExporter {
  readonly format = 'CSV';
  readonly mimeType = 'text/csv';
  readonly extension = 'csv';
  readonly supports = ['tabular_data'];

  async export(report: Report, template: ReportTemplate): Promise<ExportResult> {
    const csvContent = this.generateCSVContent(report);

    const filename = this.generateFilename(report);
    const filepath = path.join('/tmp', filename);

    await fs.writeFile(filepath, csvContent, 'utf-8');

    return {
      format: this.format.toLowerCase(),
      path: filepath,
      size: Buffer.byteLength(csvContent, 'utf-8'),
      mimeType: this.mimeType,
      filename,
      csv: csvContent,
    };
  }

  canExport(report: Report): boolean {
    if (!super.canExport(report)) {
      return false;
    }

    // CSV export requires tabular data
    return this.hasTabularData(report);
  }

  private hasTabularData(report: Report): boolean {
    // Check if report has entities or other tabular data
    return !!(report.data?.entities?.length > 0 || report.data?.items?.length > 0);
  }

  private generateCSVContent(report: Report): string {
    // Extract tabular data from report
    const data = this.extractTabularData(report);
    return this.convertToCSV(data);
  }

  private extractTabularData(report: Report): any[] {
    // Priority: entities, then items, then relationships
    if (report.data?.entities?.length > 0) {
      return report.data.entities;
    }
    if (report.data?.items?.length > 0) {
      return report.data.items;
    }
    if (report.data?.relationships?.length > 0) {
      return report.data.relationships;
    }

    // Fallback: extract from sections
    for (const section of report.sections) {
      if (section.data?.entities?.length > 0) {
        return section.data.entities;
      }
      if (Array.isArray(section.data)) {
        return section.data;
      }
    }

    return [];
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) {
      return 'No data available';
    }

    // Get all unique keys from all objects
    const keys = Array.from(
      new Set(data.flatMap((item) => Object.keys(item))),
    );

    // Create header row
    const header = keys.join(',');

    // Create data rows
    const rows = data.map((item) => {
      return keys
        .map((key) => {
          const value = item[key];
          // Handle CSV escaping
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',');
    });

    return [header, ...rows].join('\n');
  }
}
