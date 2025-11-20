/**
 * @summit/export-formats
 *
 * Multi-format export system for reports
 * Supports PDF, DOCX, PPTX, HTML, Excel, CSV, JSON, XML
 */

export { PDFExporter } from './pdf/PDFExporter.js';
export type { PDFOptions } from './pdf/PDFExporter.js';

// Export types for other formats
export interface ExportOptions {
  format: 'PDF' | 'DOCX' | 'PPTX' | 'HTML' | 'XLSX' | 'CSV' | 'JSON' | 'XML';
  includeClassification: boolean;
  includeMetadata: boolean;
  watermark?: string;
}

export interface ExportResult {
  data: Buffer | string;
  mimeType: string;
  filename: string;
}
