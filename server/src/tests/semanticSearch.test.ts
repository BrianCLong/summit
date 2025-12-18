import SemanticSearchService, { SemanticSearchOptions } from '../services/SemanticSearchService.js';

class MockEmbeddingService {
  async generateEmbedding({ text }: { text: string }): Promise<number[]> {
    return Array.from({ length: 3 }, (_, idx) => text.length * (idx + 1));
  }
}

class MockClient {
  public readonly queries: Array<{ sql: string; params?: any[] }> = [];
  private readonly responses: any[];
  public released = false;

  constructor(responses: any[]) {
    this.responses = responses;
  }

  async query(sql: string, params?: any[]) {
    this.queries.push({ sql, params });
    return this.responses.shift() ?? { rows: [] };
  }

  release() {
    this.released = true;
  }
}

class MockPool {
  public readonly client: MockClient;
  public ended = false;
  public query = jest.fn(async () => ({ rows: [{ ok: 1 }] }));
  private failHealthCheck = false;

  constructor(client: MockClient) {
    this.client = client;
  }

  async connect() {
    if (this.failHealthCheck) {
      throw new Error('health check failed');
    }
    return this.client;
  }

  async end() {
    this.ended = true;
  }

  simulateUnhealthy() {
    this.failHealthCheck = true;
  }
}

function buildService(options: Partial<SemanticSearchOptions> & { pool: MockPool }) {
  return new SemanticSearchService({
    healthCheckIntervalMs: 0,
    healthCheckTimeoutMs: 10,
    embeddingService: new MockEmbeddingService() as any,
    ...options,
  });
}

describe('SemanticSearchService', () => {
  it('performs search with filters and reuses provided pool', async () => {
    const client = new MockClient([
      {
        rows: [
          {
            id: '1',
            title: 'Threat case',
            status: 'open',
            created_at: new Date('2024-01-01'),
            similarity: 0.9,
          },
        ],
      },
    ]);
    const pool = new MockPool(client);
    const service = buildService({ pool });

    const results = await service.searchCases('query', { status: ['open'], dateFrom: '2024-01-01' }, 5);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
    expect(pool.query).toHaveBeenCalled(); // health check
    expect(client.queries[0].params?.[1]).toEqual(['open']);
    expect(client.released).toBe(true);

    await service.close();
    expect(pool.ended).toBe(false);
  });

  it('closes owned pools created via factory', async () => {
    const client = new MockClient([
      {
        rows: [
          {
            id: '2',
            title: 'Case owned pool',
            status: 'closed',
            created_at: new Date('2024-02-02'),
            similarity: 0.8,
          },
        ],
      },
    ]);
    const pool = new MockPool(client);
    const poolFactory = () => pool as any;
    const service = buildService({ poolFactory });

    const results = await service.searchCases('alert');
    expect(results[0].id).toBe('2');

    await service.close();
    expect(pool.ended).toBe(true);
  });

  it('fails fast when health checks fail', async () => {
    const client = new MockClient([]);
    const pool = new MockPool(client);
    pool.query = jest.fn(async () => {
      throw new Error('database unavailable');
    });
    const service = buildService({ pool });

    await expect(service.searchCases('broken')).rejects.toThrow('database unavailable');
  });
});
