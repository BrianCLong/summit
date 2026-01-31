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

// InvoiceLineItem - merged version
export interface InvoiceLineItem {
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  periodStart?: Date;
  periodEnd?: Date;
  meterId?: string;
  kind?: string; // 'api', 'ingest', etc.
  metadata?: Record<string, unknown>;
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}

// Invoice - merged version with fields from both branches
export interface Invoice {
  id: string;
  tenantId: string;
  status: InvoiceStatus;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  periodStart: Date;
  periodEnd: Date;
  subtotal?: number;
  taxes?: number;
  total?: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
  finalizedAt?: Date;
  paidAt?: Date;
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  WON = 'WON',
  LOST = 'LOST',
}

export interface Dispute {
  id: string;
  invoiceId: string;
  tenantId: string;
  amount: number;
  reason: string;
  status: DisputeStatus;
  evidence: string[]; // URLs or IDs
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface Adjustment {
  id: string;
  invoiceId: string;
  amount: number;
  reason: string;
  type: 'CREDIT' | 'DEBIT';
  createdAt: Date;
  appliedAt: Date;
}

export interface Credit {
  id: string;
  tenantId: string;
  amount: number;
  currency: string;
  balance: number;
  expiresAt?: Date;
}

export interface AuditTrail {
  id: string;
  entityId: string;
  entityType: 'INVOICE' | 'DISPUTE' | 'ADJUSTMENT';
  action: string;
  actorId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  timestamp: Date;
}
