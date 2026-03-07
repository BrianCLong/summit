export type ClassificationLevel = "public" | "internal" | "confidential" | "secret";

export interface ClassificationTag {
  classification: ClassificationLevel;
  residencyRegion: string;
  retentionDays: number;
  piiFields: string[];
}

export interface ProvenanceRecord {
  source: string;
  ingestedAt: string;
  hash: string;
  schemaVersion: string;
}

export interface Entity {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  tags: ClassificationTag;
  provenance: ProvenanceRecord;
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  attributes: Record<string, unknown>;
  tags: ClassificationTag;
  provenance: ProvenanceRecord;
}

export interface EventRecord {
  id: string;
  entityId: string;
  type: string;
  occurredAt: string;
  source: string;
  confidence: number;
  payload: Record<string, unknown>;
  tags: ClassificationTag;
  provenance: ProvenanceRecord;
}

export interface IngestRequest {
  entity: Entity;
  relationships?: Relationship[];
  events?: EventRecord[];
  idempotencyKey?: string;
}

export interface TimelineFilter {
  entityId?: string;
  source?: string;
  confidenceGte?: number;
  start?: string;
  end?: string;
}

export interface TimelineItem {
  id: string;
  entityId: string;
  occurredAt: string;
  source: string;
  confidence: number;
  provenance: ProvenanceRecord;
  payload: Record<string, unknown>;
}

export interface AccessRequest {
  role: string;
  resource: string;
  action: string;
  tenant: string;
  region: string;
  classification: ClassificationLevel;
}

export interface PolicyRule {
  id: string;
  role: string;
  resource: string;
  action: string;
  tenant?: string;
  region?: string;
  maxClassification?: ClassificationLevel;
  effect: "allow" | "deny";
}

export interface PolicyBundle {
  version: string;
  rules: PolicyRule[];
  fallbackEffect?: "deny" | "allow";
}

export interface DecisionLogEntry {
  traceId: string;
  timestamp: string;
  request: AccessRequest;
  decision: "allow" | "deny";
  ruleId?: string;
}

export interface AuditTrailEntry {
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface CanaryStep {
  percentage: number;
  durationSeconds: number;
}

export interface CanarySignal {
  errorRate: number;
  p99LatencyMs: number;
  saturation: number;
  customMetric?: number;
}

export interface CanaryConfig {
  steps: CanaryStep[];
  maxErrorRate: number;
  maxP99Latency: number;
  maxSaturation: number;
  maxCustomMetric?: number;
}

export interface CanaryOutcome {
  state: "rolled_forward" | "rolled_back";
  failedStep?: CanaryStep;
  reason?: string;
  auditTrail: AuditTrailEntry[];
}
