import { ReportService } from '../../src/reports/report.service.js';

describe('ReportService', () => {
  let reportService: ReportService;

  beforeEach(() => {
    reportService = new ReportService();
  });

  it('should generate a PDF buffer', async () => {
    const data = {
      title: 'Test Report',
      description: 'This is a test report',
      generatedAt: new Date().toISOString(),
      reportId: 'test-id-123',
      items: [
        { Name: 'Item 1', Value: 100 },
        { Name: 'Item 2', Value: 200 }
      ]
    };

    const pdfBuffer = await reportService.generatePDF(data);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    // Check PDF signature
    expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');
  }, 30000); // Increase timeout for puppeteer
});
