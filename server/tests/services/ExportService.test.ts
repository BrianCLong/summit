import { ExportService } from '../../src/export/export.service.js';

describe('ExportService', () => {
  let exportService: ExportService;

  beforeEach(() => {
    exportService = new ExportService();
  });

  it('should export to CSV', async () => {
    const data = [
      { name: 'Item 1', value: 100 },
      { name: 'Item 2', value: 200 }
    ];

    const csv = await exportService.exportToCSV(data);

    expect(csv).toContain('"name","value"');
    expect(csv).toContain('"Item 1",100');
    expect(csv).toContain('"Item 2",200');
  });

  it('should handle empty data for CSV', async () => {
    const csv = await exportService.exportToCSV([]);
    expect(csv).toBe('');
  });

  it('should export to PDF', async () => {
    const data = [
      { Name: 'Item 1', Value: 100 },
      { Name: 'Item 2', Value: 200 }
    ];

    const pdfBuffer = await exportService.exportToPDF(data, 'Test PDF', 'Description');

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');
  }, 30000);
});
