import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { GraphCoreService } from '../../src/services/GraphCoreService';
import { provenanceLedger } from '../../src/provenance/ledger';
import { neo4jDriver } from '../../src/db/neo4j';
import { SensitivityLevel, ClearanceLevel, RetentionClass } from '../../src/canonical/types';

// Mock dependencies
jest.mock('../../src/provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn(),
    registerClaim: jest.fn(),
  }
}));

jest.mock('../../src/db/neo4j', () => ({
  neo4jDriver: {
    session: jest.fn(),
  }
}));

describe('GraphCoreService', () => {
  let service: GraphCoreService;
  let mockSession: any;
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      run: jest.fn(),
    };
    mockSession = {
      executeWrite: jest.fn((cb) => cb(mockTx)),
      executeRead: jest.fn((cb) => cb(mockTx)),
      close: jest.fn(),
    };
    (neo4jDriver.session as jest.Mock).mockReturnValue(mockSession);

    // Reset singleton if possible, or just get instance
    service = GraphCoreService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an entity with policy labels', async () => {
    const policyLabels = {
      origin: 'Source A',
      sensitivity: SensitivityLevel.CONFIDENTIAL,
      clearance: ClearanceLevel.SECRET,
      legalBasis: 'Consent',
      needToKnow: ['Intel'],
      purposeLimitation: ['Analysis'],
      retentionClass: RetentionClass.LONG_TERM,
    };

    mockTx.run
      .mockResolvedValueOnce({ records: [] }) // terminate query result
      .mockResolvedValueOnce({ // create query result
        records: [{
          get: () => ({
            properties: {
              id: '123',
              entityType: 'Person',
              name: 'John Doe',
              policyLabels: JSON.stringify(policyLabels),
              validFrom: new Date().toISOString()
            }
          })
        }]
      });

    const result = await service.saveEntity(
      'tenant-1',
      'Person',
      { name: 'John Doe' },
      policyLabels,
      'user-1'
    );

    expect(result.id).toBe('123');
    expect(result.entityType).toBe('Person');
    expect(result.policyLabels).toEqual(policyLabels);

    expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'CREATE_UPDATE_ENTITY',
      resourceType: 'Person',
      payload: expect.objectContaining({
        policyLabels: policyLabels
      }),
      metadata: expect.objectContaining({
        purpose: 'Create/Update Entity'
      })
    }));
  });

  it('should link evidence to a claim', async () => {
    mockTx.run.mockResolvedValueOnce({
      records: [{
        get: () => ({
          properties: {
            weight: 0.9,
            description: 'Strong evidence'
          }
        })
      }]
    });

    const result = await service.linkEvidenceToClaim(
      'tenant-1',
      'claim-1',
      'evidence-1',
      0.9,
      'Strong evidence',
      'user-1'
    );

    expect(result).toEqual({
      weight: 0.9,
      description: 'Strong evidence'
    });

    expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'CREATE_RELATIONSHIP',
      resourceType: 'Relationship',
      resourceId: 'evidence-1->claim-1',
      payload: expect.objectContaining({
        fromId: 'evidence-1',
        toId: 'claim-1',
        relationType: 'SUPPORTS'
      })
    }));
  });
});
