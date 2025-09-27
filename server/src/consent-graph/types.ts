export type ConsentNodeType = 'SUBJECT' | 'PURPOSE' | 'SCOPE' | 'DELEGATION';

export type ConsentEdgeType =
  | 'SUBJECT_PURPOSE'
  | 'PURPOSE_SCOPE'
  | 'SCOPE_DELEGATION'
  | 'SUBJECT_SCOPE_FLOW';

export interface TimeInterval {
  start: string;
  end?: string | null;
}

export interface ConsentNode {
  id: string;
  type: ConsentNodeType;
  name: string;
  metadata?: Record<string, unknown>;
}

export interface DataFlow {
  id: string;
  subjectId: string;
  purposeId: string;
  scopeId: string;
  description: string;
  delegationChain: string[];
}

export interface ConsentEdgeRecord {
  recordId: string;
  edgeId: string;
  type: ConsentEdgeType;
  fromId: string;
  toId: string;
  validInterval: TimeInterval;
  txInterval: TimeInterval;
  metadata?: Record<string, unknown> & { flow?: DataFlow };
}

export interface ConsentEdge {
  id: string;
  type: ConsentEdgeType;
  fromId: string;
  toId: string;
  metadata?: Record<string, unknown> & { flow?: DataFlow };
  validInterval: TimeInterval;
  txInterval: TimeInterval;
}

export interface ConsentPolicyVersion {
  id: string;
  label: string;
  validTime: string;
  txTime: string;
  summary?: string;
}

export interface ConsentGraphSnapshot {
  asOfValid: string;
  asOfTx: string;
  nodes: ConsentNode[];
  edges: ConsentEdge[];
}

export interface ConsentPolicyDiff {
  baseVersionId: string;
  compareVersionId: string;
  added: ConsentEdge[];
  removed: ConsentEdge[];
  unchangedCount: number;
}

export interface ImpactedFlow {
  flow: DataFlow;
  scope: ConsentNode;
  delegations: ConsentNode[];
}

export interface SubjectImpact {
  subject: ConsentNode;
  flows: ImpactedFlow[];
}

export interface ConsentRevocationImpact {
  purpose: ConsentNode;
  totalImpactedFlows: number;
  impactedSubjects: SubjectImpact[];
}
