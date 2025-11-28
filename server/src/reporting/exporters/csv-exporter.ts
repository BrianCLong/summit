import { parse } from 'json2csv';
import { ExportOptions, ReportExporter, normalizeTabularData } from './base';
import { ReportArtifact } from '../types';

export class CsvExporter implements ReportExporter {
  readonly format = 'csv' as const;

  async export(data: unknown, options: ExportOptions = {}): Promise<ReportArtifact> {
    const rows = normalizeTabularData(data);
    const csv = parse(rows, { withBOM: true });
    const content = options.watermark ? `# ${options.watermark}\n${csv}` : csv;

    return {
      buffer: Buffer.from(content),
      fileName: `report-${Date.now()}.csv`,
      mimeType: 'text/csv',
      format: this.format,
    };
  }
}
