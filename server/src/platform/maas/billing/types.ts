export type UsageCategory = 'TASKS' | 'LLM_TOKENS' | 'STORAGE_NODES' | 'EVENTS';

export interface UsageRecord {
  id: string;
  tenantId: string;
  timestamp: Date;
  category: UsageCategory;
  quantity: number;
  unit: string;
  source: string; // e.g. 'maestro', 'llm-router'
}

export interface PricePlan {
  id: string;
  name: string;
  currency: string;
  perUnitRates: Record<UsageCategory, number>; // e.g. { 'TASKS': 0.01, 'LLM_TOKENS': 0.00002 }
  includedQuotas?: Record<UsageCategory, number>;
}

export interface InvoiceLineItem {
  category: UsageCategory;
  quantity: number;
  rate: number;
  total: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  lineItems: InvoiceLineItem[];
  total: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID';
}
