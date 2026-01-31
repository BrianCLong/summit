import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { EntityResolutionService } from '../service.js';
import { EntityInput } from '../models.js';
import { provenanceLedger } from '../../../provenance/ledger.js';
import * as neo4jModule from '../../../graph/neo4j.js';

// Mocks
jest.mock('../../../provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue({})
  }
}));

describe('EntityResolutionService', () => {
  let service: EntityResolutionService;
  let mockRun: jest.Mock;
  let mockSession: { run: jest.Mock; close: jest.Mock; executeWrite: jest.Mock };
  let mockDriver: { session: jest.Mock };

  beforeEach(() => {
    service = new EntityResolutionService();
    jest.clearAllMocks();
    mockRun = jest.fn().mockResolvedValue({ records: [] });
    mockSession = {
      run: mockRun,
      close: jest.fn().mockResolvedValue(undefined),
      executeWrite: jest.fn().mockImplementation(async (cb) => {
        return cb({ run: mockRun });
      }),
    };
    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
    };
    jest.spyOn(neo4jModule, 'getDriver').mockReturnValue(mockDriver as any);
  });

  it('should identify a merge candidate', async () => {
    const input: EntityInput = {
      id: 'source-1',
      type: 'Person',
      properties: { name: 'John Doe', email: 'john@example.com' },
      tenantId: 't1'
    };

    // Mock findCandidates to return a high-scoring match
    const session = mockDriver.session();

    mockRun.mockResolvedValueOnce({
        records: [{
            get: (key: string) => {
                if (key === 'properties') return { name: 'John Doe', email: 'john@example.com' };
                if (key === 'id') return 'target-1';
                return null;
            }
        }]
    });

    const decisions = await service.resolveBatch([input]);

    expect(decisions.length).toBe(1);
    expect(decisions[0].decision).toBe('MERGE');
    expect(decisions[0].candidate.targetEntityId).toBe('target-1');
  });

  it('should execute a merge and log provenance', async () => {
    const decision = {
        candidate: {
            sourceEntityId: 's1',
            targetEntityId: 't1',
            overallScore: 0.98,
            features: [],
            reasons: []
        },
        decision: 'MERGE' as const,
        confidence: 0.98
    };

    await service.applyDecision(decision, 'tenant-1', 'user-1');

    expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'ENTITY_MERGE',
        resourceId: 't1',
        payload: expect.objectContaining({ sourceId: 's1', targetId: 't1' })
    }));
  });
});
