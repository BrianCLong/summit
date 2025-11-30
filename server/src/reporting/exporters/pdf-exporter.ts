import PDFDocument from 'pdfkit';
import { ExportOptions, ReportExporter, normalizeTabularData } from './base';
import { ReportArtifact } from '../types';

function renderTable(doc: PDFDocument, rows: ReturnType<typeof normalizeTabularData>) {
  const keys = Object.keys(rows[0] || { value: 'value' });
  doc.font('Helvetica-Bold').fontSize(10).text(keys.join(' | '));
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10);
  rows.forEach((row) => {
    const line = keys.map((key) => String(row[key] ?? '')).join(' | ');
    doc.text(line);
  });
}

export class PdfExporter implements ReportExporter {
  readonly format = 'pdf' as const;

  async export(data: unknown, options: ExportOptions = {}): Promise<ReportArtifact> {
    const doc = new PDFDocument({ margin: 48 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk as Buffer));

    if (options.watermark) {
      doc
        .fontSize(48)
        .fillColor('#e0e0e0')
        .opacity(0.25)
        .rotate(-30, { origin: [250, 300] })
        .text(options.watermark, 50, 150, { align: 'center' })
        .rotate(30, { origin: [250, 300] })
        .opacity(1)
        .fillColor('black');
    }

    doc.fontSize(16).text(options.title || 'Intelligence Report', { align: 'left' });
    doc.moveDown();

    const rows = normalizeTabularData(data);
    renderTable(doc, rows);

    doc.end();
    await new Promise((resolve) => doc.on('end', resolve));

    return {
      buffer: Buffer.concat(buffers),
      fileName: `report-${Date.now()}.pdf`,
      mimeType: 'application/pdf',
      format: this.format,
    };
  }
}
