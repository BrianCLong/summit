export type SourceSystem = "crm" | "app_sdk" | "partner" | (string & {});

export interface ConsentRecord {
  recordId: string;
  source: SourceSystem;
  userId: string;
  consentType: string;
  channel?: string;
  status: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ConsentStateRecord {
  key: string;
  userId: string;
  consentType: string;
  channel?: string;
  status: string;
  source: SourceSystem;
  timestamp: string;
  provenance: {
    recordId: string;
    metadata?: Record<string, unknown>;
  };
}

export interface GraphNode {
  id: string;
  type: "user" | "consent" | "source" | "record";
  label: string;
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
  data?: Record<string, unknown>;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AppliedRule {
  rule: string;
  description: string;
  winner?: "existing" | "incoming" | "none";
}

export interface ReconciliationProof {
  recordId: string;
  key: string;
  userId: string;
  consentType: string;
  channel?: string;
  before: GraphSnapshot;
  after: GraphSnapshot;
  winningState: ConsentStateRecord | null;
  previousState?: ConsentStateRecord;
  appliedRules: AppliedRule[];
  changed: boolean;
}

export interface Snapshot {
  id: string;
  createdAt: string;
  reason: string;
  state: Record<string, ConsentStateRecord>;
  processedRecordIds: string[];
  proofs: ReconciliationProof[];
}

export interface DiffRequest {
  from?: string;
  to?: string;
  userId?: string;
}

export interface DiffEntry {
  key: string;
  userId: string;
  consentType: string;
  channel?: string;
  before?: ConsentStateRecord;
  after?: ConsentStateRecord;
}

export interface DiffResponse {
  fromSnapshot: string;
  toSnapshot: string;
  differences: DiffEntry[];
}

export interface IngestResult {
  snapshotId: string;
  proofs: ReconciliationProof[];
}

export interface RollbackResult {
  restoredSnapshotId: string;
  restoredFrom: string;
}
