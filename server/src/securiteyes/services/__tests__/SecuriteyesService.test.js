"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SecuriteyesService_js_1 = require("../SecuriteyesService.js");
// Mock dependencies
const mockRunCypher = globals_1.jest.fn();
globals_1.jest.mock('../../../graph/neo4j', () => ({
    runCypher: (...args) => mockRunCypher(...args)
}));
(0, globals_1.describe)('SecuriteyesService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = SecuriteyesService_js_1.SecuriteyesService.getInstance();
        mockRunCypher.mockResolvedValue([{ n: { properties: { id: 'test-id', tenantId: 'test-tenant' } } }]);
    });
    (0, globals_1.it)('should create a suspicious event', async () => {
        const event = await service.createSuspiciousEvent({
            tenantId: 'tenant-1',
            eventType: 'test_event',
            severity: 'medium',
            details: {},
            sourceDetector: 'test',
            timestamp: new Date().toISOString()
        });
        (0, globals_1.expect)(event).toBeDefined();
        // Since we mocked runCypher to return a generic object, just checking definition
    });
    (0, globals_1.it)('should create an incident', async () => {
        const incident = await service.createIncident({
            tenantId: 'tenant-1',
            title: 'Test Incident',
            severity: 'high',
            status: 'detected'
        });
        (0, globals_1.expect)(incident).toBeDefined();
    });
});
