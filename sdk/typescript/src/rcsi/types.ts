export type RedactionType = 'document' | 'term';

export interface DocumentInput {
  id: string;
  tokens: string[];
  vector: number[];
  metadata?: Record<string, string>;
}

export interface RedactionEvent {
  type: RedactionType;
  documentId?: string;
  term?: string;
  reason: string;
}

export interface Tombstone {
  term?: string;
  documentId: string;
  reason: string;
  sequence: number;
  timestamp: string;
  digest: string;
  version: number;
}

export interface DocumentView {
  id: string;
  tokens: string[];
  vector: number[];
  metadata?: Record<string, string>;
  updatedAt: string;
}

export interface InvertedPosting {
  term: string;
  documents: string[];
}

export interface VectorEntry {
  documentId: string;
  vector: number[];
}

export interface TermTombstoneView {
  term: string;
  tombstones: Tombstone[];
}

export interface Proof {
  kind: 'document' | 'term';
  term?: string;
  documentId: string;
  query: string;
  tombstone: Tombstone;
  version: number;
}

export interface IndexSnapshot {
  version: number;
  documents: DocumentView[];
  inverted: InvertedPosting[];
  vectors: VectorEntry[];
  documentTombstones: Tombstone[];
  termTombstones: TermTombstoneView[];
  proofs: Proof[];
}

export interface ReconcileReport {
  version: number;
  staleTokens: Record<string, string[]>;
  staleVectors: string[];
  missingTokens: Record<string, string[]>;
  missingVectors: string[];
}

