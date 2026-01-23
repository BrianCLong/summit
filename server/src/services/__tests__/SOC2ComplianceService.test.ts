import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { SOC2ComplianceService } from '../SOC2ComplianceService.js';
import { ComplianceMonitoringService } from '../ComplianceMonitoringService.js';
import { EventSourcingService } from '../EventSourcingService.js';
import { UserRepository } from '../../data/UserRepository.js';

// Mock dependencies
jest.mock('../ComplianceMonitoringService.js');
jest.mock('../EventSourcingService.js');
jest.mock('../../data/UserRepository.js');

describe('SOC2ComplianceService', () => {
  let soc2Service: SOC2ComplianceService;
  let mockComplianceMonitoringService: jest.Mocked<ComplianceMonitoringService>;
  let mockEventSourcingService: jest.Mocked<EventSourcingService>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock the implementation of verifyIntegrity
    mockEventSourcingService = new EventSourcingService(null as any) as jest.Mocked<EventSourcingService>;
    mockEventSourcingService.verifyIntegrity = jest.fn().mockResolvedValue({
      valid: true,
      totalLogs: 12345,
      validLogs: 12345,
      invalidLogs: [],
    });

    mockComplianceMonitoringService = new ComplianceMonitoringService(null as any) as jest.Mocked<ComplianceMonitoringService>;

    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockUserRepository.getActiveUserCount = jest.fn().mockResolvedValue(152);
    mockUserRepository.getMfaUserCount = jest.fn().mockResolvedValue(152);
    mockUserRepository.getAccessReviewSummary = jest.fn().mockResolvedValue([
        { role: 'tenant_admin', user_count: 25, last_review_date: '2025-12-15', status: 'APPROVED' },
    ]);
    mockUserRepository.getDeprovisioningStats = jest.fn().mockResolvedValue({ total: 14, within24h: 14 });

    soc2Service = new SOC2ComplianceService(
      mockComplianceMonitoringService,
      mockEventSourcingService,
      mockUserRepository
    );
  });

  it('should be defined', () => {
    expect(soc2Service).toBeDefined();
  });

  describe('generateSOC2Packet', () => {
    it('should generate a SOC2 packet with the correct structure', async () => {
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-12-31T23:59:59.999Z');

      const packet = await soc2Service.generateSOC2Packet(startDate, endDate) as any;

      expect(packet).toHaveProperty('auditPeriod');
      expect(packet).toHaveProperty('executiveSummary');
      expect(packet).toHaveProperty('controls');

      // Check for all implemented control keys
      const expectedControls = ['CC6.1', 'CC6.2', 'CC6.3', 'CC7.1', 'CC7.2', 'CC8.1'];
      expectedControls.forEach(controlId => {
        expect(packet.controls[controlId]).toBeDefined();
        expect(packet.controls[controlId].controlId).toBe(controlId);
      });
    });

    it('should call verifyLogIntegrity for CC8.1 evidence', async () => {
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-12-31T23:59:59.999Z');

      await soc2Service.generateSOC2Packet(startDate, endDate);

      // Verify that the mock was called
      expect(mockEventSourcingService.verifyIntegrity).toHaveBeenCalledTimes(1);
      expect(mockEventSourcingService.verifyIntegrity).toHaveBeenCalledWith({
        tenantId: 'SYSTEM',
        startDate,
        endDate,
      });
    });

    it('should contain correct audit period in the response', async () => {
        const startDate = new Date('2025-06-01T00:00:00.000Z');
        const endDate = new Date('2025-06-30T23:59:59.999Z');

        const packet = await soc2Service.generateSOC2Packet(startDate, endDate) as any;

        expect(packet.auditPeriod.startDate).toEqual(startDate);
        expect(packet.auditPeriod.endDate).toEqual(endDate);
    });
  });
});
