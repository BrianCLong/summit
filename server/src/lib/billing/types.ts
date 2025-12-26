export enum BillableEventType {
  READ_QUERY = 'read_query',
  PLANNING_RUN = 'planning_run',
  EVALUATION_RUN = 'evaluation_run',
  WRITE_ACTION = 'write_action',
  MULTI_AGENT_COORDINATION = 'multi_agent_coordination',
  PLUGIN_INVOCATION = 'plugin_invocation',
}

export type BillingUnit = 'query' | 'run' | 'action' | 'coordination_step' | 'invocation' | 'token' | 'minute';

export interface BillableEvent {
  tenantId: string;
  eventType: BillableEventType;
  quantity: number;
  unit: BillingUnit;
  timestamp: Date;
  metadata?: Record<string, any>;
  idempotencyKey: string;
  resourceId?: string; // ID of the resource being consumed/acted upon
  actorId?: string;
}

export interface MeteringReceipt {
  eventId: string; // The ID in the Provenance Ledger or Metering Store
  status: 'recorded' | 'duplicate' | 'rejected';
  timestamp: Date;
  signature?: string;
  hash?: string;
}

export interface UsagePreview {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  totalCost: number; // Estimated
  breakdown: Record<BillableEventType, {
    quantity: number;
    unit: BillingUnit;
    cost: number;
  }>;
}

export interface InvoiceLineItem {
  description: string;
  eventType: BillableEventType;
  quantity: number;
  unit: BillingUnit;
  amount: number;
  evidenceRef: string; // Link to Provenance Ledger or Audit Trail
}

export interface Invoice {
  id: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date;
  items: InvoiceLineItem[];
  totalAmount: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'void';
}
