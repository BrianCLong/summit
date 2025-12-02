import { ExportOptions, ReportExporter } from './base';
import { ReportArtifact } from '../types';

export class JsonExporter implements ReportExporter {
  readonly format = 'json' as const;

  async export(data: unknown, options: ExportOptions = {}): Promise<ReportArtifact> {
    const payload = {
      data,
      watermark: options.watermark,
      generatedAt: new Date().toISOString(),
    };

    const buffer = Buffer.from(JSON.stringify(payload, null, 2));
    return {
      buffer,
      fileName: `report-${Date.now()}.json`,
      mimeType: 'application/json',
      format: this.format,
    };
  }
}
