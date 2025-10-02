export type ForgetEntity = {
  id: string;
  type: 'document' | 'entity';
  reason?: string;
};

export type ForgetRequest = {
  runId: string;
  triggeredBy: string;
  forget: ForgetEntity[];
  issuedAt?: string;
  metadata?: Record<string, any>;
};

export type VectorDocument = {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
  namespace?: string;
};

export type VectorIndexSnapshot = {
  adapter: string;
  revision: string;
  ids: string[];
};

export type VectorAbsenceCheck = {
  id: string;
  present: boolean;
};

export type VectorIndexDiff = {
  beforeRevision: string;
  afterRevision: string;
  removed: string[];
  added: string[];
};

export type PurgeProof = {
  adapter: string;
  absence: VectorAbsenceCheck[];
  diff: VectorIndexDiff;
};

export type PurgeSummary = {
  runId: string;
  proofs: PurgeProof[];
  purgedIds: string[];
  reindexedDocuments: string[];
  startedAt: string;
  completedAt: string;
};

export type ChunkRecord = {
  id: string;
  documentId: string;
  text: string;
  embedding: number[];
  version: number;
};

export type DocumentRecord = {
  id: string;
  text: string;
  relatedIds?: string[];
  version: number;
};

export type ChunkRebuildResult = {
  documentId: string;
  chunks: ChunkRecord[];
};

export type ReplayContext = {
  applyVectorUpsert: (adapter: string, docs: VectorDocument[]) => Promise<void>;
  applyVectorDelete: (adapter: string, ids: string[]) => Promise<void>;
  applyChunkReplace: (
    documentId: string,
    chunks: ChunkRecord[],
    document?: DocumentRecord,
  ) => Promise<void>;
};

export type AuditEvent = {
  sequence: number;
  timestamp: string;
  runId: string;
  type:
    | 'forget.received'
    | 'vector.delete'
    | 'vector.upsert'
    | 'chunk.replace'
    | 'purge.completed';
  payload: Record<string, any>;
};
