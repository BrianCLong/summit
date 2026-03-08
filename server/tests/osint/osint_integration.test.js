"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Use require to bypass potential ESM/TS import issues in test environment
const { OSINTPrioritizationService } = require('../../src/services/OSINTPrioritizationService');
const { VeracityScoringService } = require('../../src/services/VeracityScoringService');
const { enqueueOSINT } = require('../../src/services/OSINTQueueService');
// Mock dependencies
globals_1.jest.mock('../../src/config/database', () => ({
    getNeo4jDriver: globals_1.jest.fn(),
    getPostgresPool: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../src/services/OSINTQueueService', () => ({
    enqueueOSINT: globals_1.jest.fn(),
    osintQueue: {
        add: globals_1.jest.fn(),
        getJobCounts: globals_1.jest.fn(),
    },
    startOSINTWorkers: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../src/utils/logger', () => ({
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
}));
const mockRun = globals_1.jest.fn();
const mockSession = {
    run: mockRun,
    close: globals_1.jest.fn(),
};
const mockDriver = {
    session: () => mockSession,
};
const { getNeo4jDriver } = require('../../src/config/database');
getNeo4jDriver.mockReturnValue(mockDriver);
(0, globals_1.describe)('OSINT System', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('OSINTPrioritizationService', () => {
        (0, globals_1.it)('should identify targets based on graph query', async () => {
            // Mock Neo4j result
            mockRun.mockResolvedValueOnce({
                records: [
                    { get: (key) => (key === 'id' ? 'entity-1' : 5) },
                    { get: (key) => (key === 'id' ? 'entity-2' : 3) },
                ],
            });
            const service = new OSINTPrioritizationService();
            const targets = await service.identifyTargets();
            (0, globals_1.expect)(targets).toEqual(['entity-1', 'entity-2']);
            (0, globals_1.expect)(mockRun).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (n:Entity)'), globals_1.expect.any(Object));
        });
        (0, globals_1.it)('should run prioritization cycle and enqueue jobs', async () => {
            // Mock Neo4j result
            mockRun.mockResolvedValueOnce({
                records: [
                    { get: (key) => (key === 'id' ? 'entity-1' : 5) },
                ],
            });
            const service = new OSINTPrioritizationService();
            await service.runPrioritizationCycle('tenant-1');
            (0, globals_1.expect)(enqueueOSINT).toHaveBeenCalledWith('comprehensive_scan', 'entity-1', { tenantId: 'tenant-1' });
        });
    });
    (0, globals_1.describe)('VeracityScoringService', () => {
        (0, globals_1.it)('should calculate veracity score correctly', async () => {
            // Mock Neo4j result for sources
            mockRun.mockResolvedValueOnce({
                records: [
                    {
                        get: (key) => {
                            if (key === 'sources') {
                                return [
                                    { properties: { trustLevel: 0.8 } },
                                    { properties: { type: 'verified' } }, // trust 0.9
                                    { properties: { type: 'unknown' } } // trust 0.5
                                ];
                            }
                            return {};
                        }
                    }
                ]
            });
            const service = new VeracityScoringService();
            const result = await service.scoreEntity('entity-1');
            (0, globals_1.expect)(result.score).toBe(100);
            (0, globals_1.expect)(result.confidence).toBe('MEDIUM'); // > 2 sources but not > 5
            (0, globals_1.expect)(mockRun).toHaveBeenCalledTimes(2); // One for query, one for update
        });
        (0, globals_1.it)('should handle no sources', async () => {
            mockRun.mockResolvedValueOnce({
                records: [{ get: (key) => (key === 'sources' ? [] : {}) }]
            });
            const service = new VeracityScoringService();
            const result = await service.scoreEntity('entity-empty');
            (0, globals_1.expect)(result.score).toBe(20); // Base score
            (0, globals_1.expect)(result.sources).toBe(0);
        });
    });
});
