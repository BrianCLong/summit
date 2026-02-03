// ESM-compatible test for IntelGraphService
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';

// Mock functions declared before mocks
const mockGetNeo4jDriver = jest.fn();
const mockAppendEntry = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../config/database.js', () => ({
  getNeo4jDriver: mockGetNeo4jDriver,
}));

jest.unstable_mockModule('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: mockAppendEntry,
  },
}));

// Mock crypto.randomUUID
jest.unstable_mockModule('crypto', () => ({
  randomUUID: jest.fn(() => 'generated-uuid'),
}));

describe('IntelGraphService', () => {
  let mockSession: { run: jest.Mock; close: jest.Mock };
  let service: any;
  let IntelGraphServiceClass: any;
  let provenanceLedgerMock: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    };

    mockSession.run.mockImplementation((query: string) => {
      if (query.includes('CREATE (d:Decision')) {
        return {
          records: [
            {
              get: () => ({ properties: { id: 'decision-1' } }),
            },
          ],
        };
      }
      if (query.includes('CREATE (c:Claim')) {
        return {
          records: [
            {
              get: () => ({ properties: { id: 'claim-1' } }),
            },
          ],
        };
      }
      return { records: [] };
    });

    const promClient = await import('prom-client');
    (promClient.Histogram as any).prototype.startTimer = jest.fn(() => jest.fn());
    (promClient.Counter as any).prototype.inc = jest.fn();

    mockGetNeo4jDriver.mockReturnValue({
      session: jest.fn(() => mockSession),
    });

    mockAppendEntry.mockResolvedValue({
      id: 'ledger-123',
      currentHash: 'hash-abc',
    });

    const ledgerModule = await import('../../provenance/ledger.js');
    provenanceLedgerMock = ledgerModule.provenanceLedger;

    const module = await import('../IntelGraphService.js');
    IntelGraphServiceClass = module.IntelGraphService;
    IntelGraphServiceClass._resetForTesting();
    service = IntelGraphServiceClass.getInstance();
  });

  describe('createDecision', () => {
    it('should create a decision node, link claims, and log to ledger', async () => {
      const decisionData = {
        question: 'Approve request?',
        recommendation: 'Approve',
        rationale: 'Looks good',
      };
      const claimIds = ['claim-1', 'claim-2'];

      const result = await service.createDecision(
        decisionData,
        claimIds,
        'user-1',
        'tenant-1',
      );

      // Verify Ledger Call
      expect(provenanceLedgerMock.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          actionType: 'CREATE',
          resourceType: 'Decision',
          payload: expect.objectContaining({
            question: 'Approve request?',
            recommendation: 'Approve',
            informedByClaimIds: claimIds,
          }),
        })
      );

      // Verify Neo4j Calls
      expect(mockSession.run).toHaveBeenCalled();

      // Check Decision Node Creation
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (d:Decision $props)'),
        expect.objectContaining({
          tenantId: 'tenant-1',
          informedByClaimIds: claimIds,
        })
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'decision-1',
        }),
      );
    });

    it('should complete within 300ms (performance check)', async () => {
      const start = Date.now();
      await service.createDecision(
        {
          question: 'Perf test?',
          recommendation: 'Proceed',
          rationale: 'Perf test',
        },
        [],
        'u1',
        't1',
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(300);
    });
  });

  describe('createClaim', () => {
    it('should create a claim node and log to ledger', async () => {
      const result = await service.createClaim(
        {
          statement: 'Claim text',
          confidence: 0.9,
          entityId: '11111111-1111-1111-1111-111111111111',
        },
        'user-1',
        'tenant-1',
      );

      expect(provenanceLedgerMock.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CREATE',
          resourceType: 'Claim',
        })
      );

      const createCall = mockSession.run.mock.calls.find((call: any[]) => call[0].includes('CREATE (c:Claim'));
      expect(createCall).toBeDefined();
      expect(result).toEqual(
        expect.objectContaining({
          id: 'claim-1',
        }),
      );
    });
  });
});
