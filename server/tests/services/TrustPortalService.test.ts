import { TrustPortalService, trustPortalService } from '../../src/services/TrustPortalService';
import { tenantSLOService } from '../../src/services/TenantSLOService';
import { trustIncidentService } from '../../src/services/TrustIncidentService';
import { provenanceLedger } from '../../src/provenance/ledger';

jest.mock('../../src/services/TenantSLOService');
jest.mock('../../src/services/TrustIncidentService');
jest.mock('../../src/provenance/ledger');
jest.mock('../../src/utils/pdfGenerator', () => ({
  generatePDF: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
  default: {
    generatePDF: jest.fn().mockResolvedValue(Buffer.from('mock-pdf'))
  }
}));

describe('TrustPortalService', () => {
  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemStatus', () => {
    it('should return operational status when no critical incidents exist', async () => {
      (trustIncidentService.getActiveIncidents as jest.Mock).mockResolvedValue([]);

      const status = await trustPortalService.getSystemStatus(mockTenantId);

      expect(status).toHaveLength(2); // US-East, EU-West
      expect(status[0].status).toBe('operational');
      expect(status[1].status).toBe('operational');
    });

    it('should return outage status when critical incident exists in region', async () => {
      (trustIncidentService.getActiveIncidents as jest.Mock).mockResolvedValue([{
        severity: 'critical',
        affectedRegions: ['US-East']
      }]);

      const status = await trustPortalService.getSystemStatus(mockTenantId);

      const usEast = status.find(s => s.region === 'US-East');
      expect(usEast?.status).toBe('outage');
    });
  });

  describe('getSLACompliance', () => {
    it('should return SLA data mapped from TenantSLOService', async () => {
      (tenantSLOService.getTenantSLO as jest.Mock).mockResolvedValue({
        tenantId: mockTenantId,
        timestamp: new Date(),
        sli: { availability: 99.95, responseTimeP95: 500 },
        slo: { availabilityCompliant: true, responseTimeCompliant: true }
      });

      const slas = await trustPortalService.getSLACompliance(mockTenantId);

      expect(slas).toHaveLength(2);
      expect(slas[0].metric).toBe('API Availability');
      expect(slas[0].currentValue).toBe(99.95);
      expect(slas[0].status).toBe('compliant');
    });

    it('should return empty array if no SLO data found', async () => {
      (tenantSLOService.getTenantSLO as jest.Mock).mockResolvedValue(null);
      const slas = await trustPortalService.getSLACompliance(mockTenantId);
      expect(slas).toEqual([]);
    });
  });

  describe('exportTrustReport', () => {
    it.skip('should generate a PDF buffer', async () => {
        // Setup mocks
        (trustIncidentService.getActiveIncidents as jest.Mock).mockResolvedValue([]);
        (tenantSLOService.getTenantSLO as jest.Mock).mockResolvedValue({
            tenantId: mockTenantId,
            timestamp: new Date(),
            sli: { availability: 99.99, responseTimeP95: 100 },
            slo: { availabilityCompliant: true, responseTimeCompliant: true }
        });
        (provenanceLedger.getEntries as jest.Mock).mockResolvedValue([]);

        const buffer = await trustPortalService.exportTrustReport(mockTenantId);
        expect(buffer).toBeInstanceOf(Buffer);
    });
  });
});
