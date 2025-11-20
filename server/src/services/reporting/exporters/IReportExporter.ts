/**
 * Report Exporter Interface
 * Defines the contract for all report export formats
 */

import type { Report, ExportResult } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';

/**
 * Interface for report exporters
 * All exporters must implement this interface
 */
export interface IReportExporter {
  /**
   * The export format this exporter handles (e.g., 'PDF', 'HTML', 'CSV')
   */
  readonly format: string;

  /**
   * MIME type for this export format
   */
  readonly mimeType: string;

  /**
   * File extension for this export format
   */
  readonly extension: string;

  /**
   * Capabilities supported by this exporter
   */
  readonly supports: string[];

  /**
   * Export a report to this format
   * @param report - The report to export
   * @param template - The template used to generate the report
   * @returns Promise resolving to export result with file path, buffer, or content
   */
  export(report: Report, template: ReportTemplate): Promise<ExportResult>;

  /**
   * Validate that the report can be exported to this format
   * @param report - The report to validate
   * @returns true if the report can be exported, false otherwise
   */
  canExport(report: Report): boolean;
}

/**
 * Base class for report exporters with common functionality
 */
export abstract class BaseReportExporter implements IReportExporter {
  abstract readonly format: string;
  abstract readonly mimeType: string;
  abstract readonly extension: string;
  abstract readonly supports: string[];

  abstract export(report: Report, template: ReportTemplate): Promise<ExportResult>;

  /**
   * Default implementation checks if report has required data
   */
  canExport(report: Report): boolean {
    return report.status === 'COMPLETED' && report.sections.length > 0;
  }

  /**
   * Generate a filename for the export
   */
  protected generateFilename(report: Report): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `report_${report.id}_${timestamp}.${this.extension}`;
  }

  /**
   * Get report title from template or use default
   */
  protected getReportTitle(report: Report, template: ReportTemplate): string {
    return template.name || 'Report';
  }
}
