import { GraphSyncValidator, SyncConfig } from '../src/validator';
import { Client as PgClient } from 'pg';
import { Driver as Neo4jDriver } from 'neo4j-driver';

describe('GraphSyncValidator', () => {
  let mockPgClient: any;
  let mockNeo4jDriver: any;
  let mockSession: any;

  beforeEach(() => {
    mockPgClient = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    };

    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    };

    mockNeo4jDriver = {
      session: jest.fn(() => mockSession),
      close: jest.fn(),
    };
  });

  it('should pass if counts and sampling match', async () => {
    const config: SyncConfig = {
      mappings: [
        {
          table: 'users',
          label: 'User',
          idKey: 'id',
          driftWindowMinutes: 5
        }
      ],
      sampleSize: 1
    };

    // Row count
    mockPgClient.query.mockResolvedValueOnce({ rows: [{ count: '10' }] });
    mockSession.run.mockResolvedValueOnce({
      records: [{ get: () => ({ toNumber: () => 10 }) }]
    });

    // Sampling
    mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] });
    mockSession.run.mockResolvedValueOnce({
      records: [{ get: () => ({ id: 'u1' }) }]
    });

    const validator = new GraphSyncValidator(mockPgClient, mockNeo4jDriver, config);
    const metrics = await validator.validate();

    expect(metrics.status).toBe('PASS');
    expect(metrics.results[0].samplingResult?.matches).toBe(1);
  });

  it('should fail if sampling mismatches', async () => {
    const config: SyncConfig = {
      mappings: [
        {
          table: 'users',
          label: 'User',
          idKey: 'id'
        }
      ],
      sampleSize: 1
    };

    // Row count
    mockPgClient.query.mockResolvedValueOnce({ rows: [{ count: '10' }] });
    mockSession.run.mockResolvedValueOnce({
      records: [{ get: () => ({ toNumber: () => 10 }) }]
    });

    // Sampling
    mockPgClient.query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] });
    mockSession.run.mockResolvedValueOnce({
      records: [] // Not found in Neo4j
    });

    const validator = new GraphSyncValidator(mockPgClient, mockNeo4jDriver, config);
    const metrics = await validator.validate();

    expect(metrics.status).toBe('FAIL');
    expect(metrics.results[0].samplingResult?.pass).toBe(false);
  });
});
