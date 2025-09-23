import fs from 'fs';
import { createHash } from 'crypto';

function hashTenant(id: string) {
  return createHash('sha256').update(id).digest('hex');
}

export class Exporter {
  format: 'csv' | 'parquet';
  constructor() {
    this.format = (process.env.BILLING_EXPORT_FORMAT as 'csv' | 'parquet') || 'csv';
  }

  async export(records: any[], path: string) {
    if (process.env.ENABLE_BILLING_EXPORT !== 'true') return;
    const allow = process.env.TENANT_EXPORT_ALLOWLIST?.split(',');
    const filtered = allow ? records.filter(r => allow.includes(r.tenant)) : records;
    if (this.format === 'csv') {
      const lines = ['tenant,cost,usageType,value'];
      for (const r of filtered) {
        lines.push(`${hashTenant(r.tenant)},${r.cost},${r.usageType},${r.value}`);
      }
      fs.writeFileSync(path, lines.join('\n'));
    } else {
      fs.writeFileSync(path, JSON.stringify(filtered));
    }
  }
}
