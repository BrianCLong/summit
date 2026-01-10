import {
  EpisodicStore,
  ExecutionLogQuery,
  ExecutionLogStore,
  MemoryQueryContext,
  MemoryRetrievalPlan,
  MemoryRouterOptions,
  TemporalGraphQuery,
  TemporalGraphStore,
  VectorIndex,
  VectorQuery
} from './interfaces';

export interface MemoryRouterDependencies {
  executionLogStore: ExecutionLogStore;
  temporalGraphStore: TemporalGraphStore;
  vectorIndex: VectorIndex;
  episodicStore: EpisodicStore;
}

export class MemoryRouter {
  private readonly defaultTimeframeHours: number;
  private readonly defaultVectorK: number;

  constructor(private readonly deps: MemoryRouterDependencies, options: MemoryRouterOptions = {}) {
    this.defaultTimeframeHours = options.defaultTimeframeHours ?? 24;
    this.defaultVectorK = options.defaultVectorK ?? 5;
  }

  route(query: MemoryQueryContext): MemoryRetrievalPlan {
    this.assertValidTimeframe(query.timeframe);
    switch (query.type) {
      case 'what_happened': {
        return {
          target: 'executionLog',
          rationale: 'Event log is authoritative for chronological replay and auditability.',
          query: this.buildExecutionLogQuery(query)
        };
      }
      case 'entity_timeline': {
        return {
          target: 'temporalGraph',
          rationale: 'Temporal graph supports entity+time traversal and cross-run relationships.',
          query: this.buildTemporalGraphQuery(query)
        };
      }
      case 'semantic_recall': {
        return {
          target: 'vector',
          rationale: 'Vector index is optimized for semantic similarity over indexed artifacts.',
          query: this.buildVectorQuery(query)
        };
      }
      case 'similar_episode': {
        return {
          target: 'episodic',
          rationale: 'Episodic store groups related runs/tasks for case-based recall.',
          query: this.buildEpisodeQuery(query)
        };
      }
      default:
        throw new Error(`Unsupported memory query type: ${query.type as string}`);
    }
  }

  private buildExecutionLogQuery(query: MemoryQueryContext): ExecutionLogQuery {
    const { tenantId, orgId, workspaceId, runId, threadId, timeframe } = query;
    if (!runId) {
      throw new Error('runId is required for execution log retrieval.');
    }

    const defaultFrom = timeframe?.from ?? new Date(Date.now() - this.defaultTimeframeHours * 60 * 60 * 1000);

    return {
      tenantId,
      orgId,
      workspaceId,
      runId,
      threadId,
      sinceTs: defaultFrom,
      untilTs: timeframe?.to,
      includeCheckpoints: true
    };
  }

  private buildTemporalGraphQuery(query: MemoryQueryContext): TemporalGraphQuery {
    const { tenantId, orgId, workspaceId, runId, threadId, entityId, entityType, timeframe } = query;
    if (!entityId && !entityType) {
      throw new Error('entityId or entityType is required for temporal graph retrieval.');
    }

    return {
      tenantId,
      orgId,
      workspaceId,
      runId,
      threadId,
      entityId,
      entityType,
      fromTs: timeframe?.from,
      toTs: timeframe?.to
    };
  }

  private buildVectorQuery(query: MemoryQueryContext): VectorQuery {
    const { tenantId, orgId, workspaceId, runId, threadId, text, embedding, tags } = query;
    if (!text && !embedding) {
      throw new Error('text or embedding is required for vector recall.');
    }

    const filters = this.buildFilters({ tags, runId, threadId });

    return {
      tenantId,
      orgId,
      workspaceId,
      runId,
      threadId,
      text,
      embedding,
      k: this.defaultVectorK,
      filters
    };
  }

  private buildEpisodeQuery(query: MemoryQueryContext) {
    const { tenantId, orgId, workspaceId, runId, threadId, tags, text, embedding } = query;
    const embeddingQuery = text || embedding ? this.buildVectorQuery(query) : undefined;
    return {
      tenantId,
      orgId,
      workspaceId,
      runId,
      threadId,
      tag: tags?.[0],
      limit: this.defaultVectorK,
      embeddingQuery
    };
  }

  private buildFilters({ tags, runId, threadId }: { tags?: string[]; runId?: string; threadId?: string }) {
    const filters: Record<string, unknown> = {};
    if (tags?.length) {
      filters.tags = tags;
    }
    if (runId) {
      filters.runId = runId;
    }
    if (threadId) {
      filters.threadId = threadId;
    }
    return Object.keys(filters).length ? filters : undefined;
  }

  private assertValidTimeframe(timeframe?: { from?: Date; to?: Date }) {
    if (timeframe?.from && timeframe?.to && timeframe.from > timeframe.to) {
      throw new Error('timeframe.from must be before timeframe.to');
    }
  }
}
