import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Define mocks
const mockQuery = jest.fn() as any;
const mockAppendEntry = jest.fn() as any;

// Mock dependencies
jest.mock('pg', () => {
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
    })),
  };
});

jest.mock('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: mockAppendEntry,
  },
}));

import { AccountDossierService } from '../service.js';

describe('AccountDossierService', () => {
  let service: AccountDossierService;
  let pool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    pool = { query: mockQuery };
    service = new AccountDossierService(pool);

    mockAppendEntry.mockResolvedValue({ id: 'prov-123' });
  });

  describe('ensureDossier', () => {
    it('should create a new dossier if none exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'dossier-123' }] });

      const id = await service.ensureDossier('tenant-1', 'account-1', 'actor-1');

      expect(id).toBe('dossier-123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO account_dossiers'),
        expect.arrayContaining(['tenant-1', 'account-1'])
      );
      expect(mockAppendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CREATE_DOSSIER',
          resourceId: 'dossier-123',
        })
      );
    });

    it('should return existing dossier if conflict occurs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-dossier' }] });

      const id = await service.ensureDossier('tenant-1', 'account-1', 'actor-1');

      expect(id).toBe('existing-dossier');
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockAppendEntry).not.toHaveBeenCalled();
    });
  });

  describe('addAssurance', () => {
    it('should add assurance and log provenance', async () => {
      const input = {
        type: 'contract',
        content: 'SLO 99.9%',
        source: 'MSA',
        metadata: { key: 'value' }
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const id = await service.addAssurance('tenant-1', 'dossier-1', input, 'actor-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dossier_assurances'),
        expect.arrayContaining(['dossier-1', 'contract', 'SLO 99.9%'])
      );

      // Update expectation to look inside nested payload.newState.data
      expect(mockAppendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'ADD_ASSURANCE',
          resourceType: 'DossierAssurance',
          payload: expect.objectContaining({
             newState: expect.objectContaining({
                 data: expect.objectContaining({ content: 'SLO 99.9%' })
             })
          })
        })
      );
    });
  });

  describe('addArtifact', () => {
      it('should add artifact and log provenance', async () => {
          const input = {
              type: 'report',
              name: 'Audit 2025',
              uri: 's3://bucket/audit.pdf',
              hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
          };

          mockQuery.mockResolvedValueOnce({ rows: [] });

          await service.addArtifact('tenant-1', 'dossier-1', input, 'actor-1');

          expect(mockQuery).toHaveBeenCalledWith(
              expect.stringContaining('INSERT INTO dossier_artifacts'),
              expect.arrayContaining(['dossier-1', 'report', input.hash])
          );

          // Note: In service.ts we removed metadata from payload root for strict typing,
          // but we still pass it in the root metadata arg to appendEntry?
          // No, we pass it in the root 'metadata' object of appendEntry options.
          // service.ts: metadata: { purpose: ... }
          // Wait, I am NOT passing contentHash in metadata anymore in service.ts!
          // I removed it to fix TS error.
          // I should verify where input.hash is stored in provenance.
          // It's in payload.newState.data.hash.

          expect(mockAppendEntry).toHaveBeenCalledWith(
              expect.objectContaining({
                  actionType: 'ADD_ARTIFACT',
                  resourceType: 'DossierArtifact',
                  payload: expect.objectContaining({
                      newState: expect.objectContaining({
                          data: expect.objectContaining({ hash: input.hash })
                      })
                  })
              })
          );
      });
  });

  describe('exportDossier', () => {
    it('should export dossier with timeline and hash', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'dossier-1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'a1', created_at: new Date('2025-01-01').toISOString() }]
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'r1', created_at: new Date('2025-01-02').toISOString() }]
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'art1', created_at: new Date('2025-01-03').toISOString() }]
      });

      const result = await service.exportDossier('tenant-1', 'account-1');

      expect(result.dossierId).toBe('dossier-1');
      expect(result.timeline).toHaveLength(3);
      expect(result.timeline[0].type).toBe('ASSURANCE');
      expect(result.timeline[2].type).toBe('ARTIFACT');
      expect(result.manifestHash).toBeDefined();
    });
  });
});
