import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { BillingAdapter, UsageReport } from '../types.js';
import { logger } from '../../config/logger.js';

export class FileBillingAdapter implements BillingAdapter {
  name = 'file-adapter';
  private exportPath: string;

  constructor(exportPath: string = 'exports/billing') {
    this.exportPath = exportPath;
    if (!fs.existsSync(this.exportPath)) {
      fs.mkdirSync(this.exportPath, { recursive: true });
    }
  }

  async exportUsage(report: UsageReport): Promise<void> {
    try {
      const csv = parse([report], {
        fields: [
          'tenantId',
          'periodStart',
          'periodEnd',
          'apiCalls',
          'ingestEvents',
          'egressGb',
          'plan',
          'quotaOverrides',
          'signature'
        ]
      });

      const dateStr = report.periodStart.toISOString().split('T')[0];
      const filename = `${report.tenantId}_${dateStr}.csv`;
      const filePath = path.join(this.exportPath, filename);

      fs.writeFileSync(filePath, csv);
      logger.info({ tenantId: report.tenantId, filePath }, 'Usage report exported to file');
    } catch (error) {
      logger.error({ err: error, tenantId: report.tenantId }, 'Failed to export usage report to file');
      throw error;
    }
  }

  async getBilledUsage(tenantId: string, periodStart: Date, periodEnd: Date): Promise<UsageReport | null> {
    // This is a naive implementation that expects a file to exist for the start date
    const dateStr = periodStart.toISOString().split('T')[0];
    const filename = `${tenantId}_${dateStr}.csv`;
    const filePath = path.join(this.exportPath, filename);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Simple CSV parsing assuming header + 1 line
      const lines = content.trim().split('\n');
      if (lines.length < 2) return null;

      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      const values = lines[1].split(',').map(v => v.replace(/"/g, ''));

      const report: any = {};
      headers.forEach((h, i) => {
        report[h] = values[i];
      });

      // Type conversion
      return {
        tenantId: report.tenantId,
        periodStart: new Date(report.periodStart),
        periodEnd: new Date(report.periodEnd),
        apiCalls: parseInt(report.apiCalls),
        ingestEvents: parseInt(report.ingestEvents),
        egressGb: parseFloat(report.egressGb),
        plan: report.plan,
        quotaOverrides: report.quotaOverrides,
        signature: report.signature
      };
    } catch (error) {
      logger.error({ err: error, tenantId }, 'Failed to read billed usage');
      return null;
    }
  }
}
