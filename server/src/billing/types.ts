export interface UsageReport {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  apiCalls: number;
  ingestEvents: number;
  egressGb: number;
  plan: string;
  quotaOverrides: string; // JSON string or description
  signature?: string;
}

export interface BillingAdapter {
  name: string;
  exportUsage(report: UsageReport): Promise<void>;
  getBilledUsage(tenantId: string, periodStart: Date, periodEnd: Date): Promise<UsageReport | null>;
}

export interface BillingConfig {
  adapter: 'file' | 'stripe' | 'aws'; // extensible
  exportPath?: string; // for file adapter
  enabled: boolean;
}
