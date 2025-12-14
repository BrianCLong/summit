export type TenantId = string;

export type EntityKind =
  | "person"
  | "organization"
  | "location"
  | "asset"
  | "event"
  | "account"
  | "communication"
  | "custom";

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
  | "owns"
  | "controls"
  | "located_at"
  | "communicated_with"
  | "member_of"
  | "funds"
  | "linked_to"
  | "custom";

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
  text: string;                  // canonical text representation
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  entityIds?: string[];          // entities mentioned or associated
}

export interface Chunk {
  id: string;
  tenantId: TenantId;
  documentId: string;
  text: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  offset: number;
}

export interface PipelineConfig {
  key: string;                          // unique pipeline id
  tenantId: TenantId;
  name: string;
  schedule?: string;                    // cron/external trigger
  source: { type: "api" | "file" | "webhook" | "db" | "custom"; config: any };
  stages: ("raw" | "normalize" | "enrich" | "index")[];
  options?: Record<string, unknown>;
}

export interface ConnectorContext {
  tenantId: TenantId;
  pipelineKey: string;
  correlationId?: string;
  logger: any; // Using any for now to avoid logger dependency circularity
}
