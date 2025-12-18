import { IntelGraphService, intelGraphService } from '../IntelGraphService';
import { provenanceLedger } from '../../provenance/ledger';
import { getDriver } from '../../graph/neo4j';

// Mock dependencies
jest.mock('../../graph/neo4j', () => ({
  getDriver: jest.fn(),
}));

jest.mock('../../provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn(),
  },
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234';
const mockClaimUUID = 'claim-uuid-5678';
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockImplementation(() => 'generated-uuid'),
}));

describe('IntelGraphService', () => {
  let mockSession: any;
  let mockTx: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTx = {
      run: jest.fn(),
    };

    mockSession = {
      executeWrite: jest.fn((callback) => callback(mockTx)),
      run: jest.fn(),
      close: jest.fn(),
    };

    (getDriver as jest.Mock).mockReturnValue({
      session: jest.fn(() => mockSession),
    });

    (provenanceLedger.appendEntry as jest.Mock).mockResolvedValue({
      id: 'ledger-123',
      currentHash: 'hash-abc',
    });
  });

  describe('createDecision', () => {
    it('should create a decision node, link claims, and log to ledger', async () => {
      const decisionData = {
        tenantId: 'tenant-1',
        outcome: 'APPROVED',
        rationale: 'Looks good',
        confidenceScore: 0.95,
        actorId: 'user-1',
        classification: 'CONFIDENTIAL',
      };
      const claimIds = ['claim-1', 'claim-2'];

      const receipt = await intelGraphService.createDecision(
        decisionData,
        claimIds
      );

      // Verify Ledger Call
      expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          actionType: 'CREATE_DECISION',
          payload: expect.objectContaining({
            outcome: 'APPROVED',
            claimIds,
          }),
        })
      );

      // Verify Neo4j Calls
      expect(mockSession.executeWrite).toHaveBeenCalled();

      // Check Decision Node Creation
      expect(mockTx.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (d:Decision'),
        expect.objectContaining({
          tenantId: 'tenant-1',
          outcome: 'APPROVED',
          ledgerEntryId: 'ledger-123',
          ledgerEntryHash: 'hash-abc',
        })
      );

      // Check Policy Label Application
      // The query string construction is internal, but we can check if it was likely constructed correctly
      // In the implementation: SET d:${labels.join(':')}
      // labels should be ['Decision', 'CONFIDENTIAL']
      // So string should contain SET d:Decision:CONFIDENTIAL
      const createCall = mockTx.run.mock.calls.find((call: any[]) => call[0].includes('CREATE (d:Decision'));
      expect(createCall[0]).toContain('SET d:Decision:CONFIDENTIAL');

      // Check Claim Linking
      expect(mockTx.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (d:Decision {id: $decisionId})'),
        expect.objectContaining({
          claimIds,
        })
      );

      // Verify Receipt
      expect(receipt).toEqual(expect.objectContaining({
        ledgerEntryId: 'ledger-123',
        ledgerEntryHash: 'hash-abc',
      }));
    });

    it('should complete within 300ms (performance check)', async () => {
      const start = Date.now();
      await intelGraphService.createDecision(
        {
            tenantId: 't1',
            outcome: 'TEST',
            rationale: 'Perf test',
            confidenceScore: 1,
            actorId: 'u1'
        },
        []
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(300);
    });
  });

  describe('createClaim', () => {
    it('should create a claim node and log to ledger', async () => {
      await intelGraphService.createClaim({
        tenantId: 'tenant-1',
        text: 'Claim text',
        type: 'fact',
        classification: 'TOP_SECRET'
      });

      expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CREATE_CLAIM',
          resourceType: 'claim'
        })
      );

      const createCall = mockTx.run.mock.calls.find((call: any[]) => call[0].includes('CREATE (c:Claim'));
      expect(createCall[0]).toContain('SET c:Claim:TOP_SECRET');
    });
  });
});
