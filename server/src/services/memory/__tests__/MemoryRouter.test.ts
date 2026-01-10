import { ExecutionLogStore } from '../interfaces';
import { MemoryRouter, MemoryRouterDependencies } from '../MemoryRouter';

const branchFromCheckpoint: ExecutionLogStore['branchFromCheckpoint'] = async <TState>(
  source: { checkpointId: string; runId: string; branchId?: string },
  initialState?: TState
) => ({
  runId: source.runId,
  checkpointId: source.checkpointId,
  ts: new Date(),
  state: initialState ?? ({} as TState),
  branchId: source.branchId
});

const createDeps = (): MemoryRouterDependencies => ({
  executionLogStore: {
    appendEvent: jest.fn(async (event) => event),
    readTail: jest.fn().mockResolvedValue([]),
    query: jest.fn().mockResolvedValue([]),
    checkpoint: jest.fn(async (snapshot) => ({ ...snapshot, ts: snapshot.ts ?? new Date() })),
    branchFromCheckpoint
  },
  temporalGraphStore: {
    upsertProjection: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ nodes: [], edges: [], schemaVersion: 'v1' }),
    traversal: jest.fn().mockResolvedValue({ nodes: [], edges: [], schemaVersion: 'v1' })
  },
  vectorIndex: {
    upsert: jest.fn().mockResolvedValue(undefined),
    queryTopK: jest.fn().mockResolvedValue([])
  },
  episodicStore: {
    createEpisode: jest.fn().mockResolvedValue({
      episodeId: 'ep-1',
      tenantId: 'tenant',
      runId: 'run',
      startedAt: new Date()
    }),
    closeEpisode: jest.fn().mockResolvedValue({
      episodeId: 'ep-1',
      tenantId: 'tenant',
      runId: 'run',
      startedAt: new Date(),
      closedAt: new Date()
    }),
    summarizeEpisode: jest.fn().mockResolvedValue({
      episodeId: 'ep-1',
      tenantId: 'tenant',
      runId: 'run',
      startedAt: new Date(),
      summary: 'stub'
    }),
    recall: jest.fn().mockResolvedValue([])
  }
});

describe('MemoryRouter', () => {
  const fixedNow = new Date('2026-01-03T00:00:00Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('routes "what happened" queries to the execution log with default window', () => {
    const router = new MemoryRouter(createDeps());
    const plan = router.route({
      type: 'what_happened',
      tenantId: 't1',
      orgId: 'org-9',
      workspaceId: 'ws-2',
      runId: 'run-123',
      threadId: 'thread-7'
    });

    expect(plan.target).toBe('executionLog');
    if (plan.target !== 'executionLog') {
      throw new Error('Expected executionLog plan');
    }

    expect(plan.query.runId).toBe('run-123');
    expect(plan.query.threadId).toBe('thread-7');
    expect(plan.query.orgId).toBe('org-9');
    expect(plan.query.workspaceId).toBe('ws-2');
    expect(plan.query.sinceTs).toEqual(new Date('2026-01-02T00:00:00Z'));
    expect(plan.query.includeCheckpoints).toBe(true);
  });

  it('routes entity timeline queries to the temporal graph', () => {
    const router = new MemoryRouter(createDeps(), { defaultTimeframeHours: 6 });
    const plan = router.route({
      type: 'entity_timeline',
      tenantId: 'tenant-a',
      entityId: 'user-1',
      timeframe: { from: new Date('2026-01-01T00:00:00Z'), to: new Date('2026-01-03T00:00:00Z') }
    });

    expect(plan.target).toBe('temporalGraph');
    if (plan.target !== 'temporalGraph') {
      throw new Error('Expected temporalGraph plan');
    }

    expect(plan.query.entityId).toBe('user-1');
    expect(plan.query.fromTs).toEqual(new Date('2026-01-01T00:00:00Z'));
    expect(plan.query.toTs).toEqual(new Date('2026-01-03T00:00:00Z'));
  });

  it('routes semantic recall queries to the vector index with tag filters', () => {
    const router = new MemoryRouter(createDeps(), { defaultVectorK: 7 });
    const plan = router.route({
      type: 'semantic_recall',
      tenantId: 'tenant-b',
      runId: 'run-9',
      threadId: 'thread-3',
      text: 'find similar events',
      tags: ['safety', 'policy']
    });

    expect(plan.target).toBe('vector');
    if (plan.target !== 'vector') {
      throw new Error('Expected vector plan');
    }

    expect(plan.query.k).toBe(7);
    expect(plan.query.filters).toEqual({ tags: ['safety', 'policy'], runId: 'run-9', threadId: 'thread-3' });
  });

  it('routes similar episode queries to the episodic store and prefers first tag', () => {
    const router = new MemoryRouter(createDeps());
    const plan = router.route({
      type: 'similar_episode',
      tenantId: 'tenant-c',
      text: 'similar incidents',
      tags: ['incident', 'rca']
    });

    expect(plan.target).toBe('episodic');
    if (plan.target !== 'episodic') {
      throw new Error('Expected episodic plan');
    }

    expect(plan.query.tag).toBe('incident');
    expect(plan.query.limit).toBe(5);
    expect(plan.query.embeddingQuery?.text).toBe('similar incidents');
  });

  it('throws when required identifiers are missing', () => {
    const router = new MemoryRouter(createDeps());

    expect(() => router.route({ type: 'what_happened', tenantId: 't1' })).toThrow('runId is required');
    expect(() => router.route({ type: 'entity_timeline', tenantId: 't1' })).toThrow('entityId or entityType is required');
    expect(() => router.route({ type: 'semantic_recall', tenantId: 't1' })).toThrow('text or embedding is required');
  });

  it('throws when timeframe is invalid', () => {
    const router = new MemoryRouter(createDeps());

    expect(() =>
      router.route({
        type: 'entity_timeline',
        tenantId: 't1',
        entityId: 'entity',
        timeframe: { from: new Date('2026-01-02T00:00:00Z'), to: new Date('2026-01-01T00:00:00Z') }
      })
    ).toThrow('timeframe.from must be before timeframe.to');
  });
});
