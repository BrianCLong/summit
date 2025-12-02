import { SOC2ComplianceService } from '../SOC2ComplianceService';
import { ComplianceMonitoringService } from '../ComplianceMonitoringService';
import { EventSourcingService } from '../EventSourcingService';

// Mock dependencies
jest.mock('../ComplianceMonitoringService');
jest.mock('../EventSourcingService');

describe('SOC2ComplianceService', () => {
  let soc2Service: SOC2ComplianceService;
  let mockComplianceMonitoringService: jest.Mocked<ComplianceMonitoringService>;
  let mockEventSourcingService: jest.Mocked<EventSourcingService>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock the implementation of verifyLogIntegrity
    mockEventSourcingService = new EventSourcingService(null) as jest.Mocked<EventSourcingService>;
    mockEventSourcingService.verifyLogIntegrity = jest.fn().mockResolvedValue({
      valid: true,
      totalLogs: 12345,
      validLogs: 12345,
      invalidLogs: [],
    });

    mockComplianceMonitoringService = new ComplianceMonitoringService(null) as jest.Mocked<ComplianceMonitoringService>;

    soc2Service = new SOC2ComplianceService(
      mockComplianceMonitoringService,
      mockEventSourcingService
    );
  });

  it('should be defined', () => {
    expect(soc2Service).toBeDefined();
  });

  describe('generateSOC2Packet', () => {
    it('should generate a SOC2 packet with the correct structure', async () => {
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-12-31T23:59:59.999Z');

      const packet = await soc2Service.generateSOC2Packet(startDate, endDate);

      expect(packet).toHaveProperty('auditPeriod');
      expect(packet).toHaveProperty('executiveSummary');
      expect(packet).toHaveProperty('controls');

      // Check for all implemented control keys
      const expectedControls = ['CC6.1', 'CC6.2', 'CC6.3', 'CC7.1', 'CC7.2', 'CC8.1'];
      expectedControls.forEach(controlId => {
        expect(packet.controls).toHaveProperty(controlId);
        expect(packet.controls[controlId].controlId).toBe(controlId);
      });
    });

    it('should call verifyLogIntegrity for CC8.1 evidence', async () => {
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-12-31T23:59:59.999Z');

      await soc2Service.generateSOC2Packet(startDate, endDate);

      // Verify that the mock was called
      expect(mockEventSourcingService.verifyLogIntegrity).toHaveBeenCalledTimes(1);
      expect(mockEventSourcingService.verifyLogIntegrity).toHaveBeenCalledWith({
        tenantId: 'SYSTEM',
        startDate,
        endDate,
      });
    });

    it('should contain correct audit period in the response', async () => {
        const startDate = new Date('2025-06-01T00:00:00.000Z');
        const endDate = new Date('2025-06-30T23:59:59.999Z');

        const packet = await soc2Service.generateSOC2Packet(startDate, endDate);

        expect(packet.auditPeriod.startDate).toEqual(startDate);
        expect(packet.auditPeriod.endDate).toEqual(endDate);
    });
  });
});
