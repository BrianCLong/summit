import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProvenanceClaimService } from '../../services/ProvenanceClaimService.js';
import { pool } from '../../db/pg.js';
import { provenanceLedger } from '../../provenance/ledger.js';

// Mock dependencies
jest.mock('../../db/pg.js', () => ({
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn(),
  },
}));

describe('ProvenanceClaimService', () => {
  let service: ProvenanceClaimService;
  let mockClient: any;

  beforeEach(() => {
    service = ProvenanceClaimService.getInstance();
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Using any cast to bypass complex type checks on mock methods
    (pool.connect as any).mockResolvedValue(mockClient);
  });

  describe('registerClaim', () => {
    it('should register a structured claim', async () => {
      const input = {
        content: 'Subject Predicate Object',
        subject: 'EntityA',
        predicate: 'met_with',
        object: 'EntityB',
        claim_type: 'fact',
        confidence: 0.9,
        evidence_ids: [],
        source_id: 'source-123',
        license_id: 'lic-123',
        created_by: 'user-1',
        tenant_id: 'tenant-1',
      };

      const mockClaim = { id: 'claim-123', ...input };

      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO claims_registry')) {
          return { rows: [mockClaim] };
        }
        return { rows: [] };
      });

      const result = await service.registerClaim(input);

      expect(result).toEqual(mockClaim);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO claims_registry'),
        expect.arrayContaining(['EntityA', 'met_with', 'EntityB'])
      );
      expect(provenanceLedger.appendEntry).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('linkClaimToEvidence', () => {
    it('should link evidence with granular details', async () => {
      const input = {
        claim_id: 'claim-123',
        evidence_id: 'evidence-456',
        relation_type: 'SUPPORTS' as const,
        offset_start: 10,
        offset_end: 20,
        segment_text: 'evidence text',
        created_by: 'user-1',
        tenant_id: 'tenant-1',
      };

      const mockLink = { id: 'link-789', ...input };

      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('SELECT id FROM claim_evidence_links')) {
          return { rows: [] };
        }
        if (query.includes('INSERT INTO claim_evidence_links')) {
          return { rows: [mockLink] };
        }
        return { rows: [] };
      });

      const result = await service.linkClaimToEvidence(input);

      expect(result).toEqual(mockLink);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO claim_evidence_links'),
        expect.arrayContaining([10, 20, 'evidence text'])
      );
    });
  });
});
