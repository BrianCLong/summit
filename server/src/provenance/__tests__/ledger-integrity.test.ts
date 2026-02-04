import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ProvenanceLedgerV2, provenanceLedger } from '../ledger.js';
import { pool } from '../../db/pg.js';

// Mock DB connection
jest.mock('../../db/pg', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

// Mock telemetry to avoid import side effects that crash tests
jest.mock('../../lib/telemetry/comprehensive-telemetry.js', () => ({
  telemetry: {
    recordLatency: jest.fn(),
    incrementCounter: jest.fn(),
    // add other methods if needed
  },
  default: {
    getInstance: () => ({
       recordLatency: jest.fn(),
       incrementCounter: jest.fn(),
    })
  }
}));

// Mock tracer in ledger.ts implicitly if needed, but it uses local tracer object there.
// However, ledger.ts imports 'prom-client' and other things.
// If ledger.ts imports `../db/neo4j` via some chain, we might need to mock that too.
// The error trace showed `server/src/db/neo4j.ts` importing telemetry.
jest.mock('../../db/neo4j', () => ({
  neo4jDriver: {
    session: jest.fn(),
    close: jest.fn(),
  }
}));

jest.mock('../../audit/index.js', () => ({
  advancedAuditSystem: {
    logEvent: jest.fn(),
  },
}));

// Create a mock pool client
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('ProvenanceLedgerV2 Integrity & Witnesses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as any).mockResolvedValue(mockClient);

    // Mock successful query response for appending
    (mockClient.query as any).mockImplementation((...args: any[]) => {
        const query = args[0];
        const params = args[1] as any[];
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
            return Promise.resolve();
        }
        if (query.includes('INSERT INTO provenance_ledger_v2')) {
            // Mock returning the inserted row
            const inserted = {
                id: params[0],
                tenant_id: params[1],
                sequence_number: params[2],
                previous_hash: params[3],
                current_hash: params[4],
                timestamp: params[5],
                action_type: params[6],
                resource_type: params[7],
                resource_id: params[8],
                actor_id: params[9],
                actor_type: params[10],
                payload: params[11],
                metadata: params[12],
                signature: params[13],
                attestation: params[14],
                witness: params[15],
            };
            return Promise.resolve({ rows: [inserted] });
        }
        if (query.includes('SELECT * FROM provenance_ledger_v2 WHERE tenant_id')) {
           return Promise.resolve({ rows: [] }); // No previous entry
        }
        return Promise.resolve({ rows: [] });
    });

    (pool.query as any).mockImplementation((query: string, params: unknown[]) => {
        return Promise.resolve({ rows: [] });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should detect broken hash chains', async () => {
    // Setup: Create a broken chain scenario
    const entry1: any = {
      id: '1',
      tenant_id: 'tenant-1',
      sequence_number: '1',
      previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      current_hash: 'hash1',
      timestamp: new Date(),
      action_type: 'create',
      resource_type: 'test',
      resource_id: 'r1',
      actor_id: 'user1',
      actor_type: 'user',
      payload: '{}',
      metadata: '{}'
    };

    const entry2: any = {
      id: '2',
      tenant_id: 'tenant-1',
      sequence_number: '2',
      previous_hash: 'wrong_hash', // BROKEN CHAIN
      current_hash: 'hash2',
      timestamp: new Date(),
      action_type: 'update',
      resource_type: 'test',
      resource_id: 'r1',
      actor_id: 'user1',
      actor_type: 'user',
      payload: '{}',
      metadata: '{}'
    };

    (pool.query as any).mockResolvedValueOnce({ rows: [entry1, entry2] });

    // Act
    const verification = await provenanceLedger.verifyChainIntegrity('tenant-1');

    // Assert
    expect(verification.valid).toBe(false);
    expect(verification.brokenChains).toBeGreaterThan(0);
  });

  it('should include witnesses in new entries', async () => {
    // Act
    const entry = await provenanceLedger.appendEntry({
      tenantId: 't1',
      actionType: 'test',
      resourceType: 'res',
      resourceId: '123',
      actorId: 'u1',
      actorType: 'user',
      timestamp: new Date(),
      payload: {
        mutationType: 'CREATE',
        entityId: '123',
        entityType: 'res',
        newState: {
          id: '123',
          type: 'res',
          version: 1,
          data: {},
          metadata: {},
        },
      },
      metadata: {}
    });

    // Assert
    expect(entry.witness).toBeDefined();
    expect(entry.witness?.witnessId).toBeDefined();
    expect(entry.witness?.signature).toBeDefined();
  });
});
