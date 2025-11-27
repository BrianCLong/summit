/**
 * Exporter Factory
 * Creates appropriate exporter based on format
 */

import type { IReportExporter } from './IReportExporter.js';
import { HTMLExporter } from './HTMLExporter.js';
import { JSONExporter } from './JSONExporter.js';
import { CSVExporter } from './CSVExporter.js';
import { PDFExporter } from './PDFExporter.js';
import { PPTXExporter } from './PPTXExporter.js';

export class ExporterFactory {
  private exporters: Map<string, IReportExporter> = new Map();

  constructor() {
    this.registerDefaultExporters();
  }

  /**
   * Register default exporters
   */
  private registerDefaultExporters(): void {
    this.registerExporter(new HTMLExporter());
    this.registerExporter(new JSONExporter());
    this.registerExporter(new CSVExporter());
    this.registerExporter(new PDFExporter());
    this.registerExporter(new PPTXExporter());
  }

  /**
   * Register a custom exporter
   */
  registerExporter(exporter: IReportExporter): void {
    const format = exporter.format.toUpperCase();
    this.exporters.set(format, exporter);
  }

  /**
   * Get exporter for a specific format
   */
  getExporter(format: string): IReportExporter {
    const normalizedFormat = format.toUpperCase();
    const exporter = this.exporters.get(normalizedFormat);

    if (!exporter) {
      throw new Error(`No exporter registered for format: ${format}`);
    }

    return exporter;
  }

  /**
   * Check if an exporter exists for a format
   */
  hasExporter(format: string): boolean {
    const normalizedFormat = format.toUpperCase();
    return this.exporters.has(normalizedFormat);
  }

  /**
   * Get all supported formats
   */
  getSupportedFormats(): string[] {
    return Array.from(this.exporters.keys());
  }

  /**
   * Get exporter metadata
   */
  getExporterInfo(format: string) {
    const exporter = this.getExporter(format);
    return {
      format: exporter.format,
      mimeType: exporter.mimeType,
      extension: exporter.extension,
      supports: exporter.supports,
    };
  }
}
