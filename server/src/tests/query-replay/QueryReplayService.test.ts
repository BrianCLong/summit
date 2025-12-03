import { QueryReplayService } from '../../services/query-replay/QueryReplayService';
import { getPostgresPool } from '../../db/postgres';
import { neo } from '../../db/neo4j';
import { getNeo4jDriver } from '../../db/neo4j';
import pino from 'pino';

// Mock dependencies
jest.mock('../../db/postgres');
jest.mock('../../db/neo4j');
// Mock the telemetry module to avoid loading the real one which causes TS errors
jest.mock('../../lib/telemetry/comprehensive-telemetry', () => ({
    telemetry: {
      subsystems: {
        database: {
          queries: { add: jest.fn() },
          errors: { add: jest.fn() },
          latency: { record: jest.fn() },
        },
        cache: {
            hits: { add: jest.fn() },
            misses: { add: jest.fn() },
            sets: { add: jest.fn() },
            dels: { add: jest.fn() },
        },
        api: {
            requests: { add: jest.fn() },
            errors: { add: jest.fn() },
        }
      },
      requestDuration: { record: jest.fn() },
      incrementActiveConnections: jest.fn(),
      decrementActiveConnections: jest.fn(),
      recordRequest: jest.fn(),
    }
}));

jest.mock('pino', () => {
    const mockPino = jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        child: jest.fn().mockReturnThis()
    }));
    (mockPino as any).stdTimeFunctions = {
        isoTime: jest.fn()
    };
    return mockPino;
});

describe('QueryReplayService', () => {
  let queryReplayService: QueryReplayService;
  let mockPostgresPool: any;
  let mockNeo4jDriver: any;
  let mockSession: any;

  beforeEach(() => {
    mockPostgresPool = {
      write: jest.fn(),
      read: jest.fn(),
    };
    (getPostgresPool as jest.Mock).mockReturnValue(mockPostgresPool);

    mockSession = {
        beginTransaction: jest.fn().mockReturnValue({
            run: jest.fn().mockResolvedValue({
                summary: { profile: { dbHits: 10 } }
            }),
            commit: jest.fn(),
            rollback: jest.fn()
        }),
        close: jest.fn()
    };

    mockNeo4jDriver = {
        session: jest.fn().mockReturnValue(mockSession)
    };
    (getNeo4jDriver as jest.Mock).mockReturnValue(mockNeo4jDriver);

    // Reset mock for neo.run
    (neo.run as jest.Mock).mockReset();

    // Reset singleton instance if necessary or rely on fresh mocks
    // Since QueryReplayService is a singleton, it might hold onto old mocks if we are not careful.
    // However, it calls getPostgresPool() inside the methods, so it should pick up the new mock return value.
    queryReplayService = QueryReplayService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordSlowQuery', () => {
    it('should record a slow query to postgres', async () => {
      await queryReplayService.recordSlowQuery(
        'MATCH (n) RETURN n',
        { limit: 10 },
        1500,
        'tenant-1'
      );

      expect(mockPostgresPool.write).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO query_replay_log'),
        expect.arrayContaining([
          'MATCH (n) RETURN n',
          JSON.stringify({ limit: 10 }),
          1500,
          'tenant-1',
        ])
      );
    });
  });

  describe('getSlowQueries', () => {
    it('should retrieve slow queries from postgres', async () => {
      mockPostgresPool.read.mockResolvedValue({
        rows: [{ id: '1', cypher: 'MATCH (n) RETURN n' }]
      });

      const result = await queryReplayService.getSlowQueries(10, 0);

      expect(mockPostgresPool.read).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM query_replay_log'),
        [10, 0]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('replayQuery', () => {
    it('should replay a query and record the result', async () => {
      // Mock finding the query
      mockPostgresPool.read.mockResolvedValue({
        rows: [{
            id: '1',
            cypher: 'MATCH (n) RETURN n',
            params: { limit: 10 },
            tenant_id: 'tenant-1'
        }]
      });

      // Mock neo.run for EXPLAIN
      (neo.run as jest.Mock).mockResolvedValue({
          summary: { plan: { operator: 'AllNodesScan' } }
      });

      await queryReplayService.replayQuery('1');

      // Verify EXPLAIN was called
      expect(neo.run).toHaveBeenCalledWith(
          'EXPLAIN MATCH (n) RETURN n',
          { limit: 10 },
          { tenantId: 'tenant-1' }
      );

      // Verify PROFILE was called via session transaction
      expect(mockSession.beginTransaction).toHaveBeenCalled();
      expect(mockPostgresPool.write).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE query_replay_log'),
          expect.any(Array)
      );
    });

    it('should throw error if query not found', async () => {
        mockPostgresPool.read.mockResolvedValue({ rows: [] });
        await expect(queryReplayService.replayQuery('999')).rejects.toThrow('Query not found');
    });
  });
});
