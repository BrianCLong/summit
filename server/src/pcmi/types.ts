export type AttributeBucket = Record<string, string | number | boolean>;

export interface SubjectBucket {
  roles: string[];
  attributes: AttributeBucket;
}

export interface PolicyScope {
  tenant: string;
  purpose: string;
  policyVersion: string;
  schemaVersion: string;
  subjectBucket: SubjectBucket;
}

export interface RedactionProfile {
  mode: 'none' | 'mask' | 'remove';
  fields?: string[];
}

export interface AuthorizedDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface AuthorizedNode {
  id: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface AuthorizedEdge {
  from: string;
  to: string;
  type?: string;
}

export interface AuthorizedObjects {
  documents: AuthorizedDocument[];
  nodes: AuthorizedNode[];
  edges: AuthorizedEdge[];
  redactionProfile?: RedactionProfile;
}

export interface BudgetConfig {
  vectorK: number;
  lexK: number;
  maxHops: number;
  maxExpansions: number;
}

export interface MicroIndexSeal {
  psid: string;
  policyVersion: string;
  schemaVersion: string;
  objectSetHash: string;
  redactionProfile?: RedactionProfile;
}

export interface MicroIndexMetadataEntry {
  id: string;
  metadata?: Record<string, unknown>;
}

export interface MicroIndex {
  seal: MicroIndexSeal;
  vectorItems: AuthorizedDocument[];
  lexicalItems: AuthorizedDocument[];
  nodes: AuthorizedNode[];
  edges: AuthorizedEdge[];
  adjacency: Map<string, Set<string>>;
  metadata: Map<string, MicroIndexMetadataEntry>;
  deltaLog: MicroIndexDelta[];
}

export type DeltaOperation = 'insert' | 'update' | 'delete';

export interface MicroIndexDelta {
  operation: DeltaOperation;
  document?: AuthorizedDocument;
  node?: AuthorizedNode;
  edge?: AuthorizedEdge;
}

export interface RetrievalResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface QueryAudit {
  psid: string;
  seal: MicroIndexSeal;
  seed: number;
}

export interface QueryResponse {
  evidence: RetrievalResult[];
  audit: QueryAudit;
}
