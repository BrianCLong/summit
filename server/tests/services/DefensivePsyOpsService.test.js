"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DefensivePsyOpsService_1 = require("../../src/services/DefensivePsyOpsService");
const event_bus_js_1 = require("../../src/lib/events/event-bus.js");
const globals_1 = require("@jest/globals");
// Mock dependencies
const mockQuery = globals_1.jest.fn();
const mockClient = {
    query: mockQuery,
    release: globals_1.jest.fn(),
};
const mockPool = {
    connect: globals_1.jest.fn(() => Promise.resolve(mockClient)),
    query: mockQuery,
};
globals_1.jest.mock('../../src/config/database', () => ({
    getPostgresPool: globals_1.jest.fn(() => mockPool),
}));
(0, globals_1.describe)('DefensivePsyOpsService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Re-instantiate service to reset listeners/state if any
        service = new DefensivePsyOpsService_1.DefensivePsyOpsService();
    });
    (0, globals_1.afterEach)(() => {
        event_bus_js_1.eventBus.removeAllListeners();
    });
    (0, globals_1.it)('should detect threats in content', async () => {
        // Mock DB insert response
        mockQuery.mockImplementationOnce(() => Promise.resolve({
            rows: [
                {
                    id: 'threat-123',
                    threat_level: 'HIGH',
                    status: 'MONITORING',
                },
            ],
        }));
        const content = "This is urgent! They don't want you to know the truth!";
        const threat = await service.detectPsychologicalThreats(content, {
            source: 'TEST',
        });
        (0, globals_1.expect)(threat).toBeDefined();
        (0, globals_1.expect)(threat?.id).toBe('threat-123');
        // Expect query to have been called for insert
        (0, globals_1.expect)(mockQuery).toHaveBeenCalled();
    });
    (0, globals_1.it)('should not detect threats in safe content', async () => {
        const content = 'The weather is nice today and we verified the data.';
        const threat = await service.detectPsychologicalThreats(content, {
            source: 'TEST',
        });
        (0, globals_1.expect)(threat).toBeNull();
        (0, globals_1.expect)(mockQuery).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should process events from Red Team', async () => {
        const detectSpy = globals_1.jest
            .spyOn(service, 'detectPsychologicalThreats')
            .mockResolvedValue({ id: 'threat-sim' });
        const payload = {
            narrative: 'Shocking exposed secrets! Urgent!',
            virality: 0.9,
        };
        // Emit event
        event_bus_js_1.eventBus.emit('raw-event', {
            source: 'red-team',
            type: 'influence',
            data: payload,
        });
        // Wait for async processing
        await new Promise((resolve) => setTimeout(resolve, 100));
        (0, globals_1.expect)(detectSpy).toHaveBeenCalled();
    });
});
