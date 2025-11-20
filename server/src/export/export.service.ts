import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Parser } = require('json2csv');
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { ReportService, ReportOptions } from '../reports/report.service.js';

export class ExportService {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  async exportToCSV(data: any[], fields?: string[]): Promise<string> {
    if (!data || data.length === 0) {
      return '';
    }

    const opts = fields ? { fields } : {};
    const parser = new Parser(opts);
    return parser.parse(data);
  }

  async exportToPDF(data: any[], title: string, description?: string): Promise<Buffer> {
    const reportOptions: ReportOptions = {
      title,
      description,
      generatedAt: new Date().toLocaleString(),
      reportId: uuidv4(),
      items: data
    };

    return this.reportService.generatePDF(reportOptions);
  }
}
