"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SOC2ComplianceService_js_1 = require("../SOC2ComplianceService.js");
const ComplianceMonitoringService_js_1 = require("../ComplianceMonitoringService.js");
const EventSourcingService_js_1 = require("../EventSourcingService.js");
const UserRepository_js_1 = require("../../data/UserRepository.js");
// Mock dependencies
globals_1.jest.mock('../ComplianceMonitoringService.js');
globals_1.jest.mock('../EventSourcingService.js');
globals_1.jest.mock('../../data/UserRepository.js');
(0, globals_1.describe)('SOC2ComplianceService', () => {
    let soc2Service;
    let mockComplianceMonitoringService;
    let mockEventSourcingService;
    let mockUserRepository;
    (0, globals_1.beforeEach)(() => {
        // Clear all mocks before each test
        globals_1.jest.clearAllMocks();
        // Mock the implementation of verifyIntegrity
        mockEventSourcingService = new EventSourcingService_js_1.EventSourcingService(null);
        mockEventSourcingService.verifyIntegrity = globals_1.jest.fn().mockResolvedValue({
            valid: true,
            totalLogs: 12345,
            validLogs: 12345,
            invalidLogs: [],
        });
        mockComplianceMonitoringService = new ComplianceMonitoringService_js_1.ComplianceMonitoringService(null);
        mockUserRepository = new UserRepository_js_1.UserRepository();
        mockUserRepository.getActiveUserCount = globals_1.jest.fn().mockResolvedValue(152);
        mockUserRepository.getMfaUserCount = globals_1.jest.fn().mockResolvedValue(152);
        mockUserRepository.getAccessReviewSummary = globals_1.jest.fn().mockResolvedValue([
            { role: 'tenant_admin', user_count: 25, last_review_date: '2025-12-15', status: 'APPROVED' },
        ]);
        mockUserRepository.getDeprovisioningStats = globals_1.jest.fn().mockResolvedValue({ total: 14, within24h: 14 });
        soc2Service = new SOC2ComplianceService_js_1.SOC2ComplianceService(mockComplianceMonitoringService, mockEventSourcingService, mockUserRepository);
    });
    (0, globals_1.it)('should be defined', () => {
        (0, globals_1.expect)(soc2Service).toBeDefined();
    });
    (0, globals_1.describe)('generateSOC2Packet', () => {
        (0, globals_1.it)('should generate a SOC2 packet with the correct structure', async () => {
            const startDate = new Date('2025-01-01T00:00:00.000Z');
            const endDate = new Date('2025-12-31T23:59:59.999Z');
            const packet = await soc2Service.generateSOC2Packet(startDate, endDate);
            (0, globals_1.expect)(packet).toHaveProperty('auditPeriod');
            (0, globals_1.expect)(packet).toHaveProperty('executiveSummary');
            (0, globals_1.expect)(packet).toHaveProperty('controls');
            // Check for all implemented control keys
            const expectedControls = ['CC6.1', 'CC6.2', 'CC6.3', 'CC7.1', 'CC7.2', 'CC8.1'];
            expectedControls.forEach(controlId => {
                (0, globals_1.expect)(packet.controls[controlId]).toBeDefined();
                (0, globals_1.expect)(packet.controls[controlId].controlId).toBe(controlId);
            });
        });
        (0, globals_1.it)('should call verifyLogIntegrity for CC8.1 evidence', async () => {
            const startDate = new Date('2025-01-01T00:00:00.000Z');
            const endDate = new Date('2025-12-31T23:59:59.999Z');
            await soc2Service.generateSOC2Packet(startDate, endDate);
            // Verify that the mock was called
            (0, globals_1.expect)(mockEventSourcingService.verifyIntegrity).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockEventSourcingService.verifyIntegrity).toHaveBeenCalledWith({
                tenantId: 'SYSTEM',
                startDate,
                endDate,
            });
        });
        (0, globals_1.it)('should contain correct audit period in the response', async () => {
            const startDate = new Date('2025-06-01T00:00:00.000Z');
            const endDate = new Date('2025-06-30T23:59:59.999Z');
            const packet = await soc2Service.generateSOC2Packet(startDate, endDate);
            (0, globals_1.expect)(packet.auditPeriod.startDate).toEqual(startDate);
            (0, globals_1.expect)(packet.auditPeriod.endDate).toEqual(endDate);
        });
    });
});
