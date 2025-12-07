export type TenantId = string;
export type PrincipalId = string;
export type UsageEventId = string;
export type PlanId = string;

export type UsageKind =
  | "llm.tokens"
  | "llm.requests"
  | "maestro.runs"
  | "maestro.tasks"
  | "graph.analytics.jobs"
  | "graph.queries"
  | "ingestion.pipeline.runs"
  | "ingestion.records"
  | "search.rag.queries"
  | "external_api.requests"
  | "storage.bytes"
  | "custom";

export interface UsageEvent {
  id?: UsageEventId;
  tenantId: TenantId;
  principalId?: PrincipalId;
  principalKind?: "user" | "api_key" | "service_account" | "system";
  kind: UsageKind;
  quantity: number;
  unit: string; // "tokens", "requests", "runs", "records", "bytes", etc.
  occurredAt?: string; // ISO string
  metadata?: Record<string, unknown>; // e.g., model, route, templateKey
  correlationId?: string;
}

export interface Plan {
  id: PlanId;
  name: string;          // "Free", "Pro", "Enterprise"
  description?: string;
  currency: string;      // "USD"
  // per-usage-kind configuration
  limits: {
    [K in string]?: { // Index signature to allow UsageKind + strings
      monthlyIncluded?: number;     // “included units per month”
      hardCap?: number;            // absolute max per month
      softThresholds?: number[];   // for warnings
      unitPrice?: number;          // price per unit beyond included
    };
  };
  features: Record<string, boolean | number | string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantPlan {
  tenantId: TenantId;
  planId: PlanId;
  effectiveFrom: string;
  effectiveTo?: string;
  customOverrides?: Record<string, unknown>;
}

export interface UsageSummary {
  tenantId: TenantId;
  periodStart: string;
  periodEnd: string;
  kind: UsageKind;
  totalQuantity: number;
  unit: string;
  breakdown?: Record<string, number>;
}

export interface InvoiceLineItem {
  kind: UsageKind;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  metadata?: Record<string, unknown>;
}

export interface Invoice {
  id?: string;
  tenantId: TenantId;
  periodStart: string;
  periodEnd: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxes?: number;
  total: number;
  status: 'DRAFT' | 'FINALIZED' | 'PAID' | 'VOID';
}

export interface QuotaCheckInput {
  tenantId: TenantId;
  kind: UsageKind;
  quantity: number;        // about to be consumed
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  hardCap?: number;
  softThresholdTriggered?: number; // the threshold crossed, if any
}
