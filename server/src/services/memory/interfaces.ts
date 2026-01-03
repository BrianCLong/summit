export type MemoryQueryType =
  | 'what_happened'
  | 'entity_timeline'
  | 'semantic_recall'
  | 'similar_episode';

export interface ExecutionEvent {
  tenantId: string;
  orgId?: string;
  workspaceId?: string;
  runId: string;
  threadId: string;
  eventId: string;
  ts: Date;
  actor: 'agent' | 'user' | string;
  eventType: string;
  toolName?: string;
  toolArgsJson?: Record<string, unknown>;
  toolResultRef?: string;
  llmPromptRef?: string;
  llmResponseRef?: string;
  idempotencyKey?: string;
  parentEventId?: string;
  spanId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionLogQuery {
  tenantId: string;
  runId: string;
  threadId?: string;
  eventTypes?: string[];
  sinceTs?: Date;
  untilTs?: Date;
  limit?: number;
  includeCheckpoints?: boolean;
}

export interface CheckpointSnapshot<TState = unknown> {
  runId: string;
  checkpointId: string;
  ts: Date;
  state: TState;
  parentCheckpointId?: string;
  branchId?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionLogStore {
  appendEvent(event: ExecutionEvent): Promise<ExecutionEvent>;
  readTail(query: ExecutionLogQuery): Promise<ExecutionEvent[]>;
  query(query: ExecutionLogQuery): Promise<ExecutionEvent[]>;
  checkpoint<TState = unknown>(snapshot: Omit<CheckpointSnapshot<TState>, 'ts'> & { ts?: Date }): Promise<CheckpointSnapshot<TState>>;
  branchFromCheckpoint<TState = unknown>(
    source: { checkpointId: string; runId: string; branchId?: string },
    initialState?: TState
  ): Promise<CheckpointSnapshot<TState>>;
}

export interface VectorIndexRecord {
  id: string;
  tenantId: string;
  embedding: number[];
  text: string;
  source: {
    eventId?: string;
    episodeId?: string;
    docId?: string;
    runId?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface VectorQuery {
  tenantId: string;
  text?: string;
  embedding?: number[];
  k?: number;
  filters?: Record<string, unknown>;
  rerank?: boolean;
}

export interface VectorIndex {
  upsert(records: VectorIndexRecord[]): Promise<void>;
  queryTopK(query: VectorQuery): Promise<VectorIndexRecord[]>;
  rerank?(records: VectorIndexRecord[], query: VectorQuery): Promise<VectorIndexRecord[]>;
}

export interface TemporalGraphNode {
  id: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface TemporalGraphEdge {
  from: string;
  to: string;
  type: string;
  ts: Date;
  validFrom?: Date;
  validTo?: Date;
  properties?: Record<string, unknown>;
}

export interface TemporalGraphProjection {
  nodes: TemporalGraphNode[];
  edges: TemporalGraphEdge[];
  schemaVersion: string;
  watermarkTs?: Date;
}

export interface TemporalGraphQuery {
  tenantId: string;
  entityId?: string;
  entityType?: string;
  fromTs?: Date;
  toTs?: Date;
  depth?: number;
  filters?: Record<string, unknown>;
}

export interface TemporalGraphStore {
  upsertProjection(projection: TemporalGraphProjection): Promise<void>;
  query(query: TemporalGraphQuery): Promise<TemporalGraphProjection>;
  traversal(query: TemporalGraphQuery): Promise<TemporalGraphProjection>;
}

export interface EpisodeMetadata {
  episodeId: string;
  tenantId: string;
  runId: string;
  startedAt: Date;
  closedAt?: Date;
  summary?: string;
  participants?: string[];
  toolsUsed?: string[];
  outcome?: string;
  tags?: string[];
  logPointers?: string[];
  metadata?: Record<string, unknown>;
}

export interface EpisodeQuery {
  tenantId: string;
  runId?: string;
  tag?: string;
  participants?: string[];
  outcome?: string;
  limit?: number;
  embeddingQuery?: VectorQuery;
}

export interface EpisodicStore {
  createEpisode(metadata: Omit<EpisodeMetadata, 'episodeId' | 'startedAt'>): Promise<EpisodeMetadata>;
  closeEpisode(episodeId: string, summary?: string): Promise<EpisodeMetadata>;
  summarizeEpisode(episodeId: string): Promise<EpisodeMetadata>;
  recall(query: EpisodeQuery): Promise<EpisodeMetadata[]>;
}

export interface MemoryQueryContext {
  type: MemoryQueryType;
  tenantId: string;
  runId?: string;
  entityId?: string;
  entityType?: string;
  text?: string;
  embedding?: number[];
  timeframe?: { from?: Date; to?: Date };
  tags?: string[];
}

export type MemoryRetrievalPlan =
  | {
      target: 'executionLog';
      rationale: string;
      query: ExecutionLogQuery;
    }
  | {
      target: 'temporalGraph';
      rationale: string;
      query: TemporalGraphQuery;
    }
  | {
      target: 'vector';
      rationale: string;
      query: VectorQuery;
    }
  | {
      target: 'episodic';
      rationale: string;
      query: EpisodeQuery;
    };

export interface MemoryRouterOptions {
  defaultTimeframeHours?: number;
  defaultVectorK?: number;
}
