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
    const { tenantId, runId, timeframe } = query;
    if (!runId) {
      throw new Error('runId is required for execution log retrieval.');
    }

    const defaultFrom = timeframe?.from ?? new Date(Date.now() - this.defaultTimeframeHours * 60 * 60 * 1000);

    return {
      tenantId,
      runId,
      sinceTs: defaultFrom,
      untilTs: timeframe?.to,
      includeCheckpoints: true
    };
  }

  private buildTemporalGraphQuery(query: MemoryQueryContext): TemporalGraphQuery {
    const { tenantId, entityId, entityType, timeframe } = query;
    if (!entityId && !entityType) {
      throw new Error('entityId or entityType is required for temporal graph retrieval.');
    }

    return {
      tenantId,
      entityId,
      entityType,
      fromTs: timeframe?.from,
      toTs: timeframe?.to
    };
  }

  private buildVectorQuery(query: MemoryQueryContext): VectorQuery {
    const { tenantId, text, embedding, tags } = query;
    if (!text && !embedding) {
      throw new Error('text or embedding is required for vector recall.');
    }

    return {
      tenantId,
      text,
      embedding,
      k: this.defaultVectorK,
      filters: tags?.length ? { tags } : undefined
    };
  }

  private buildEpisodeQuery(query: MemoryQueryContext) {
    const { tenantId, runId, tags } = query;
    return {
      tenantId,
      runId,
      tag: tags?.[0],
      limit: this.defaultVectorK
    };
  }
}
