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

export interface Invoice {
    id: string;
    tenantId: string;
    periodStart: Date;
    periodEnd: Date;
    currency: string;
    lineItems: InvoiceLineItem[];
    subtotal: number;
    taxes: number;
    total: number;
    status: 'DRAFT' | 'FINALIZED' | 'PAID' | 'VOID';
    createdAt: Date;
}

export interface InvoiceLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    kind: string; // 'api', 'ingest', etc.
}
