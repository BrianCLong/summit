import { CsvExporter } from './csv-exporter';
import { DocxExporter } from './docx-exporter';
import { ExcelExporter } from './excel-exporter';
import { JsonExporter } from './json-exporter';
import { PdfExporter } from './pdf-exporter';
import { PptxExporter } from './pptx-exporter';
import { ReportExporter } from './base';

export const exporters: ReportExporter[] = [
  new JsonExporter(),
  new CsvExporter(),
  new PdfExporter(),
  new ExcelExporter(),
  new DocxExporter(),
  new PptxExporter(),
];

export const exporterMap: Record<string, ReportExporter> = Object.fromEntries(
  exporters.map((exp) => [exp.format, exp]),
);
