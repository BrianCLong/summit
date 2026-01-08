export type CanonicalEntityName =
  | "user"
  | "account"
  | "tenant"
  | "asset"
  | "document"
  | "ticket"
  | "runbook"
  | "model"
  | "dataset"
  | "feature"
  | "automation"
  | "policy"
  | "release";

export interface SchemaDefinition {
  name: CanonicalEntityName;
  version: string;
  schema: Record<string, unknown>;
  description?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

export type IntentVerb = "request" | "approve" | "escalate" | "undo" | "preview";

export interface IntentEvent {
  id: string;
  intent: IntentVerb;
  actor: string;
  surface: string;
  targetEntity: CanonicalEntityName;
  targetId: string;
  payload?: Record<string, unknown>;
  occurredAt: string;
  tenantId: string;
}

export interface DataQualityOptions {
  freshnessMinutes?: number;
  requiredFields?: string[];
  dedupeKey?: string;
}

export interface DataQualityRecord {
  id: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface QualityAlert {
  table: string;
  reason: string;
  severity: "warning" | "critical";
  records: DataQualityRecord[];
}

export interface AlertSink {
  sendAlert: (alert: QualityAlert) => void;
}

export interface RetrievalDocument {
  id: string;
  title: string;
  owner: string;
  tags: string[];
  refreshIntervalMinutes: number;
  lastRefreshedAt?: string;
  link: string;
}

export interface FeatureEntry {
  key: string;
  value: unknown;
  lineage: string[];
  ttlMinutes: number;
  createdAt: string;
  version: string;
  sourceArtifacts: string[];
}

export interface FeatureRetrievalResult {
  value: unknown;
  version: string;
  lineage: string[];
  sourceArtifacts: string[];
  expiresAt: string;
}

export interface PiiRule {
  path: string;
  action: "redact" | "hash" | "drop";
}

export interface ProvenanceRecord {
  outputId: string;
  artifactIds: string[];
  sourceInputs: Record<string, unknown>;
  createdAt: string;
  citations: string[];
  feedback?: FeedbackRecord;
}

export interface FeedbackRecord {
  outputId: string;
  actor: string;
  helpful: boolean;
  reason?: string;
  recordedAt: string;
}

export interface ModelVersion {
  modelId: string;
  version: string;
  release: string;
  metrics: Record<string, number>;
  rolledBack?: boolean;
  rollbackReason?: string;
}

export interface BackfillJob<TInput, TFeature> {
  id: string;
  inputs: TInput[];
  compute: (input: TInput) => Promise<FeatureEntry & { value: TFeature }>;
  allowOverwrite?: boolean;
}
