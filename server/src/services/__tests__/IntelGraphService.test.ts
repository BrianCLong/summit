import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const getNeo4jDriverMock = jest.fn();
const appendEntryMock = jest.fn();

jest.unstable_mockModule('../../config/database.js', () => ({
  getNeo4jDriver: getNeo4jDriverMock,
}));

jest.unstable_mockModule('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: appendEntryMock,
  },
  ProvenanceLedgerV2: class ProvenanceLedgerV2 {},
}));

describe('IntelGraphService', () => {
  let IntelGraphService: any;
  let mockSession: { run: jest.Mock; close: jest.Mock };
  let service: any;

  beforeAll(async () => {
    ({ IntelGraphService } = await import('../IntelGraphService.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSession = {
      run: jest.fn((query: string) => {
        if (query.includes('CREATE (c:Claim')) {
          return {
            records: [{ get: () => ({ properties: { id: 'claim-1' } }) }],
          };
        }

        return {
          records: [{ get: () => ({ properties: { id: 'decision-1' } }) }],
        };
      }),
      close: jest.fn(),
    };

    getNeo4jDriverMock.mockReturnValue({
      session: jest.fn(() => mockSession),
    });
    appendEntryMock.mockResolvedValue({ id: 'ledger-123', currentHash: 'hash-abc' });

    IntelGraphService._resetForTesting();
    service = IntelGraphService.getInstance();
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

      expect(appendEntryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          actionType: 'CREATE',
          resourceType: 'Decision',
          payload: expect.objectContaining({
            question: 'Approve request?',
            recommendation: 'Approve',
            informedByClaimIds: claimIds,
          }),
        }),
      );

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (d:Decision $props)'),
        expect.objectContaining({
          tenantId: 'tenant-1',
          informedByClaimIds: claimIds,
        }),
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

      expect(appendEntryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CREATE',
          resourceType: 'Claim',
        }),
      );

      const createCall = mockSession.run.mock.calls.find((call: any[]) =>
        call[0].includes('CREATE (c:Claim'),
      );
      expect(createCall).toBeDefined();
      expect(result).toEqual(
        expect.objectContaining({
          id: 'claim-1',
        }),
      );
    });
  });
});
