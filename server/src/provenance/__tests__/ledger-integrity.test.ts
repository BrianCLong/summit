import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProvenanceLedgerV2, provenanceLedger } from '../ledger';
import { witnessRegistry, CryptoWitness } from '../witness';
import { pool } from '../../db/pg';

// Mock DB connection
vi.mock('../../db/pg', () => ({
  pool: {
    connect: vi.fn(),
    query: vi.fn(),
  },
}));

// Mock telemetry to avoid import side effects that crash tests
vi.mock('../../lib/telemetry/comprehensive-telemetry.ts', () => ({
  telemetry: {
    recordLatency: vi.fn(),
    incrementCounter: vi.fn(),
    // add other methods if needed
  },
  default: {
    getInstance: () => ({
       recordLatency: vi.fn(),
       incrementCounter: vi.fn(),
    })
  }
}));

// Mock tracer in ledger.ts implicitly if needed, but it uses local tracer object there.
// However, ledger.ts imports 'prom-client' and other things.
// If ledger.ts imports `../db/neo4j` via some chain, we might need to mock that too.
// The error trace showed `server/src/db/neo4j.ts` importing telemetry.
vi.mock('../../db/neo4j', () => ({
  neo4jDriver: {
    session: vi.fn(),
    close: vi.fn(),
  }
}));

// Create a mock pool client
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

describe('ProvenanceLedgerV2 Integrity & Witnesses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (pool.connect as any).mockResolvedValue(mockClient);

    // Mock successful query response for appending
    mockClient.query.mockImplementation((query, params) => {
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
                witnesses: params[15]
            };
            return Promise.resolve({ rows: [inserted] });
        }
        if (query.includes('SELECT * FROM provenance_ledger_v2 WHERE tenant_id')) {
           return Promise.resolve({ rows: [] }); // No previous entry
        }
        return Promise.resolve({ rows: [] });
    });

    (pool.query as any).mockImplementation((query, params) => {
        return Promise.resolve({ rows: [] });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    // Register a witness
    const witness = new CryptoWitness('w1', 'Witness 1');
    witnessRegistry.register(witness);

    // Spy on sign
    const signSpy = vi.spyOn(witness, 'sign');

    // Act
    const entry = await provenanceLedger.appendEntry({
      tenantId: 't1',
      actionType: 'test',
      resourceType: 'res',
      resourceId: '123',
      actorId: 'u1',
      actorType: 'user',
      payload: { foo: 'bar' },
      metadata: {}
    });

    // Assert
    expect(signSpy).toHaveBeenCalled();
    expect(entry.witnesses).toBeDefined();
    expect(entry.witnesses).toHaveLength(1);
    expect(entry.witnesses![0].id).toBe('w1');
    expect(entry.witnesses![0].signature).toBeDefined();
  });
});
