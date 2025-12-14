export type TenantId = string;

export type EntityKind =
  | 'person'
  | 'organization'
  | 'location'
  | 'asset'
  | 'event'
  | 'account'
  | 'communication'
  | 'custom';

export interface Entity {
  id: string;
  tenantId: TenantId;
  kind: EntityKind;
  externalRefs: { system: string; id: string }[];
  labels: string[]; // tags, classifications
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  sourceIds: string[]; // ingestion sources that contributed
}

export type EdgeKind =
  | 'owns'
  | 'controls'
  | 'located_at'
  | 'communicated_with'
  | 'member_of'
  | 'funds'
  | 'linked_to'
  | 'custom';

export interface Edge {
  id: string;
  tenantId: TenantId;
  fromEntityId: string;
  toEntityId: string;
  kind: EdgeKind;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  sourceIds: string[];
}

export interface Document {
  id: string;
  tenantId: TenantId;
  title?: string;
  mimeType?: string;
  source: { system: string; id: string; uri?: string };
  text: string; // canonical text representation
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  entityIds?: string[]; // entities mentioned or associated
}

export interface DocumentChunk {
  id: string;
  tenantId: TenantId;
  documentId: string;
  text: string;
  embedding?: number[];
  tokenCount: number;
  offset: number;
  metadata: Record<string, unknown>;
  entityIds?: string[];
}

export interface PipelineConfig {
  key: string; // unique pipeline id
  tenantId: TenantId;
  name: string;
  schedule?: string; // cron/external trigger
  source: { type: 'api' | 'file' | 'webhook' | 'db' | 'custom'; config: any };
  stages: ('raw' | 'normalize' | 'enrich' | 'index')[];
  options?: Record<string, unknown>;
}

export interface IngestionRun {
  id: string;
  tenantId: TenantId;
  pipelineKey: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  startTime: string;
  endTime?: string;
  metrics: {
    recordsProcessed: number;
    recordsFailed: number;
    durationMs: number;
  };
  error?: string;
}

export interface DLQRecord {
  id: string;
  tenantId: TenantId;
  pipelineKey: string;
  stage: string;
  reason: string;
  payload: any;
  createdAt: string;
  retryCount: number;
}
