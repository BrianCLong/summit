export type UsageDimension =
  | 'llm.tokens'
  | 'maestro.runs'
  | 'maestro.runtime'
  | 'graph.queries'
  | 'graph.analytics.jobs'
  | 'data.documents'
  | 'data.storage.bytes'
  | 'ingestion.records'
  | 'api.requests'
  | 'automation.actions'
  | 'other';

export interface UsageEvent {
  id: string;
  tenantId: string;
  principalId?: string;
  dimension: UsageDimension;
  quantity: number;
  unit: string;
  source: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  recordedAt: string;
}
