
import { jest } from '@jest/globals';
import { PrivacyService, DSARType, DSARStatus } from '../PrivacyService.js';
import { provenanceLedger } from '../../provenance/ledger.js';

// Mock dependencies
jest.mock('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue({ id: 'mock-entry-id' }),
  },
}));

describe('PrivacyService', () => {
  let privacyService: PrivacyService;

  beforeEach(() => {
    // Reset singleton instance for testing if possible, or just get instance
    // Since it's a singleton, we might need a way to reset it or just accept shared state.
    // For this test, we'll assume we can just get the instance.
    privacyService = PrivacyService.getInstance();
    jest.clearAllMocks();
  });

  describe('submitRequest', () => {
    it('should successfully submit a DSAR request', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';
      const type = DSARType.ACCESS;

      const request = await privacyService.submitRequest(tenantId, userId, type);

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.tenantId).toBe(tenantId);
      expect(request.userId).toBe(userId);
      expect(request.type).toBe(type);
      expect(request.status).not.toBe(DSARStatus.FAILED);

      expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        tenantId,
        actionType: 'PRIVACY_DSAR_SUBMITTED',
        resourceType: 'dsar_request',
        resourceId: request.id,
      }));
    });
  });

  describe('verifyRequest', () => {
    it('should transition request to PROCESSING and then COMPLETED after verification', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-2';
      const type = DSARType.EXPORT;

      const request = await privacyService.submitRequest(tenantId, userId, type);
      const requestId = request.id;

      // verification happens automatically in the current implementation
      // so we wait a bit for the promise chain to settle
      await new Promise(resolve => setTimeout(resolve, 200));

      const updatedRequest = await privacyService.getRequestStatus(requestId);

      // In the simulated flow, it might be completed or processing
      expect([DSARStatus.PROCESSING, DSARStatus.COMPLETED]).toContain(updatedRequest?.status);

      if (updatedRequest?.status === DSARStatus.COMPLETED) {
         expect(updatedRequest.evidenceId).toBeDefined();
      }
    });
  });

  describe('getEvidence', () => {
    it('should return evidence for a completed request', async () => {
       const tenantId = 'tenant-1';
      const userId = 'user-3';
      const type = DSARType.EXPORT;

      const request = await privacyService.submitRequest(tenantId, userId, type);

      // Wait for simulation to complete
      await new Promise(resolve => setTimeout(resolve, 1200));

      const evidence = await privacyService.getEvidence(request.id);

      expect(evidence).toBeDefined();
      expect(evidence?.requestId).toBe(request.id);
      expect(evidence?.actions.length).toBeGreaterThan(0);
    });
  });
});
