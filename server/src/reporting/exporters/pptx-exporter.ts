import PptxGenJS from 'pptxgenjs';
import { ExportOptions, ReportExporter, normalizeTabularData } from './base';
import { ReportArtifact } from '../types';

export class PptxExporter implements ReportExporter {
  readonly format = 'pptx' as const;

  async export(data: unknown, options: ExportOptions = {}): Promise<ReportArtifact> {
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    slide.addText(options.title || 'Threat Assessment', {
      x: 0.5,
      y: 0.3,
      fontSize: 20,
      bold: true,
    });

    const rows = normalizeTabularData(data);
    const headers = Object.keys(rows[0] || { value: 'value' });
    const tableRows = [headers, ...rows.map((row) => headers.map((key) => `${row[key] ?? ''}`))];
    slide.addTable(tableRows, { x: 0.5, y: 1, w: 9, fontSize: 12 });

    if (options.watermark) {
      slide.addText(options.watermark, {
        x: 1,
        y: 4,
        fontSize: 30,
        color: 'c0c0c0',
        rotate: -25,
        bold: true,
        transparency: 50,
      });
    }

    const buffer = await pptx.write('arraybuffer');
    return {
      buffer: Buffer.from(buffer as ArrayBuffer),
      fileName: `report-${Date.now()}.pptx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      format: this.format,
    };
  }
}
