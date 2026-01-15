import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { ProvenanceLedgerV2 } from '../../src/provenance/ledger';
import type { MutationPayload } from '../../src/provenance/types';
import { pool } from '../../src/db/pg';

// Mock DB pool
jest.mock('../../src/db/pg', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  }
}));

// Mock crypto pipeline to avoid startup issues
jest.mock('../../src/security/crypto/index.js', () => ({
  createDefaultCryptoPipeline: jest.fn(() => Promise.resolve({} as any)),
}));

describe('ProvenanceLedgerV2', () => {
  let ledger: ProvenanceLedgerV2;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.MockedFunction<() => Promise<any>>).mockResolvedValue(
      mockClient,
    );

    // We need to bypass the singleton to test properly or mock the methods on the singleton?
    // The class is exported, so we can instantiate it for testing.
    ledger = new ProvenanceLedgerV2();
  });

  afterEach(() => {
    jest.clearAllMocks();
    ledger.cleanup();
  });

  it('should append a claim entry', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // getLastEntry (empty)
      .mockResolvedValueOnce({ rows: [] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const claimData: MutationPayload = {
      mutationType: 'CREATE',
      entityId: 'claim-1',
      entityType: 'Claim',
      statement: 'Test Claim',
      relatedClaims: [{ claimId: 'c2', relationship: 'supports' }],
      newState: {
        id: 'claim-1',
        type: 'Claim',
        version: 1,
        data: { statement: 'Test Claim' },
        metadata: {},
      },
    };

    await ledger.appendEntry({
      tenantId: 'tenant-1',
      timestamp: new Date(),
      actionType: 'REGISTER_CLAIM',
      resourceType: 'Claim',
      resourceId: 'claim-1',
      actorId: 'user-1',
      actorType: 'user',
      payload: claimData,
      metadata: {},
    });

    expect(mockClient.query).toHaveBeenCalledTimes(4);
    const insertCall = mockClient.query.mock.calls[2];
    const insertSql = insertCall[0];
    const insertParams = insertCall[1];

    expect(insertSql).toContain('INSERT INTO provenance_ledger_v2');
    expect(insertParams[6]).toBe('REGISTER_CLAIM');
    expect(insertParams[7]).toBe('Claim');
    expect(insertParams[8]).toBe('claim-1');

    const payload = JSON.parse(insertParams[11]);
    expect(payload.statement).toBe('Test Claim');
    expect(payload.relatedClaims).toEqual(claimData.relatedClaims);
  });
});
