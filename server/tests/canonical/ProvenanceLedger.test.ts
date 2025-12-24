import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { ProvenanceLedgerV2 } from '../../src/provenance/ledger';
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
  createDefaultCryptoPipeline: jest.fn().mockResolvedValue({}),
}));

describe('ProvenanceLedgerV2', () => {
  let ledger: ProvenanceLedgerV2;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);

    // We need to bypass the singleton to test properly or mock the methods on the singleton?
    // The class is exported, so we can instantiate it for testing.
    ledger = new ProvenanceLedgerV2();
  });

  afterEach(() => {
    jest.clearAllMocks();
    ledger.cleanup();
  });

  it('should register a claim', async () => {
    // Mock getLastEntry
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // getLastEntry (empty)
      .mockResolvedValueOnce({ rows: [] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const claimData = { statement: 'Test Claim' };
    const related = [{ claimId: 'c2', relationship: 'supports' }];

    await ledger.registerClaim(
      'claim-1',
      claimData,
      'tenant-1',
      'user-1',
      related
    );

    expect(mockClient.query).toHaveBeenCalledTimes(4); // BEGIN, SELECT, INSERT, COMMIT
    const insertCall = mockClient.query.mock.calls[2];
    const insertSql = insertCall[0];
    const insertParams = insertCall[1];

    expect(insertSql).toContain('INSERT INTO provenance_ledger_v2');
    expect(insertParams[6]).toBe('REGISTER_CLAIM'); // action_type
    expect(insertParams[7]).toBe('Claim'); // resource_type
    expect(insertParams[8]).toBe('claim-1'); // resource_id

    const payload = JSON.parse(insertParams[11]);
    expect(payload.statement).toBe('Test Claim');
    expect(payload.relatedClaims).toEqual(related);
  });
});
