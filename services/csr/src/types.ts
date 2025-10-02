export type ConsentStatus = 'granted' | 'revoked' | 'pending';

export interface ConsentRecord {
  recordId: string;
  subjectId: string;
  consentType: string;
  status: ConsentStatus;
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ConsentDecision {
  recordId: string;
  status: ConsentStatus;
  source: string;
  timestamp: string;
  priority: number;
}

export interface ConsentState {
  [consentType: string]: ConsentDecision;
}

export interface ConsentStateMap {
  [subjectId: string]: ConsentState;
}

export interface ReconciliationGraphNode {
  id: string;
  label: string;
  payload: Record<string, unknown>;
}

export interface ReconciliationGraphEdge {
  from: string;
  to: string;
  rule: string;
  recordId: string;
}

export interface ReconciliationProof {
  subjectId: string;
  consentType: string;
  recordId: string;
  before: ConsentDecision | null;
  after: ConsentDecision;
  appliedRule: string;
  graph: {
    nodes: ReconciliationGraphNode[];
    edges: ReconciliationGraphEdge[];
  };
  considered: Array<{
    recordId: string;
    status: ConsentStatus;
    source: string;
    timestamp: string;
    priority: number;
  }>;
}

export interface Snapshot {
  id: string;
  createdAt: string;
  state: ConsentStateMap;
}
