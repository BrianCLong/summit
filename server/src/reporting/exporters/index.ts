import { CsvExporter } from './csv-exporter.js';
import { DocxExporter } from './docx-exporter.js';
import { ExcelExporter } from './excel-exporter.js';
import { JsonExporter } from './json-exporter.js';
import { PdfExporter } from './pdf-exporter.js';
import { PptxExporter } from './pptx-exporter.js';
import { XmlExporter } from './xml-exporter.js';
import { ReportExporter } from './base.js';

export const exporters: ReportExporter[] = [
  new JsonExporter(),
  new CsvExporter(),
  new PdfExporter(),
  new ExcelExporter(),
  new DocxExporter(),
  new PptxExporter(),
  new XmlExporter(),
];

export const exporterMap: Record<string, ReportExporter> = Object.fromEntries(
  exporters.map((exp) => [exp.format, exp]),
);
