"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const OSINTAggregator_js_1 = __importDefault(require("../../src/services/OSINTAggregator.js"));
const VeracityScoringService_1 = require("../../src/services/VeracityScoringService");
// Mock dependencies
globals_1.jest.mock('../../src/config/database', () => ({
    getNeo4jDriver: globals_1.jest.fn(),
    getPostgresPool: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../src/services/SecureFusionService.js', () => ({
    __esModule: true,
    default: globals_1.jest.fn().mockImplementation(() => ({
        fuse: globals_1.jest.fn().mockImplementation(async () => ({ ok: true })),
    })),
}));
globals_1.jest.mock('../../src/utils/logger', () => ({
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
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
        getNeo4jDriver.mockReturnValue(mockDriver);
    });
    (0, globals_1.describe)('OSINTAggregator', () => {
        (0, globals_1.it)('should enqueue items with deterministic scoring', async () => {
            const randomSpy = globals_1.jest.spyOn(Math, 'random').mockReturnValue(0);
            const service = new OSINTAggregator_js_1.default();
            const result = await service.ingest({ text: 'nuclear incident', type: 'signal' }, 'satellite-feed-alpha');
            (0, globals_1.expect)(result.status).toBe('queued');
            (0, globals_1.expect)(result.score).toBeGreaterThan(0);
            randomSpy.mockRestore();
        });
    });
    (0, globals_1.describe)('VeracityScoringService', () => {
        (0, globals_1.it)('should calculate veracity score correctly', async () => {
            // Mock Neo4j result for sources
            mockRun.mockImplementationOnce(async () => ({
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
                ],
            }));
            const service = new VeracityScoringService_1.VeracityScoringService();
            const result = await service.scoreEntity('entity-1');
            // avg trust = (0.8 + 0.9 + 0.5) / 3 = 0.7333
            // raw = 73.33 * (1 + log10(3)) = 73.33 * (1 + 0.477) = 73.33 * 1.477 = 108.3
            // capped at 100
            (0, globals_1.expect)(result.score).toBe(100);
            (0, globals_1.expect)(result.confidence).toBe('MEDIUM'); // > 2 sources but not > 5
            (0, globals_1.expect)(mockRun).toHaveBeenCalledTimes(2); // One for query, one for update
        });
        (0, globals_1.it)('should handle no sources', async () => {
            mockRun.mockImplementationOnce(async () => ({
                records: [{ get: (key) => (key === 'sources' ? [] : {}) }],
            }));
            const service = new VeracityScoringService_1.VeracityScoringService();
            const result = await service.scoreEntity('entity-empty');
            (0, globals_1.expect)(result.score).toBe(20); // Base score
            (0, globals_1.expect)(result.sources).toBe(0);
        });
    });
});
