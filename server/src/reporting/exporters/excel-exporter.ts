import ExcelJS from 'exceljs';
import { ExportOptions, ReportExporter, normalizeTabularData } from './base';
import { ReportArtifact } from '../types';

export class ExcelExporter implements ReportExporter {
  readonly format = 'xlsx' as const;

  async export(data: unknown, options: ExportOptions = {}): Promise<ReportArtifact> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');
    const rows = normalizeTabularData(data);
    const headers = Object.keys(rows[0] || { value: 'value' });
    sheet.addRow(headers);
    rows.forEach((row) => sheet.addRow(headers.map((key) => row[key] ?? '')));

    if (options.watermark) {
      const watermarkSheet = workbook.addWorksheet('Watermark');
      watermarkSheet.getCell('A1').value = options.watermark;
      watermarkSheet.getCell('A1').font = { color: { argb: '80C0C0C0' }, bold: true, size: 20 };
      watermarkSheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      fileName: `report-${Date.now()}.xlsx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      format: this.format,
    };
  }
}
