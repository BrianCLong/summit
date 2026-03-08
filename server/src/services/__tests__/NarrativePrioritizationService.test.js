"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock dependencies
const mockRun = globals_1.jest.fn();
const mockClose = globals_1.jest.fn();
const mockSessionFactory = globals_1.jest.fn();
const getNeo4jDriverMock = globals_1.jest.fn();
const mockSession = {
    run: mockRun,
    close: mockClose,
};
const mockDriver = {
    session: mockSessionFactory,
};
globals_1.jest.unstable_mockModule('../../db/neo4j.js', () => ({
    getNeo4jDriver: getNeo4jDriverMock,
}));
(0, globals_1.describe)('NarrativePrioritizationService', () => {
    let NarrativePrioritizationService;
    let service;
    (0, globals_1.beforeAll)(async () => {
        ({ NarrativePrioritizationService } = await Promise.resolve().then(() => __importStar(require('../NarrativePrioritizationService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockSessionFactory.mockReturnValue(mockSession);
        getNeo4jDriverMock.mockReturnValue(mockDriver);
        NarrativePrioritizationService.instance = undefined;
        service = NarrativePrioritizationService.getInstance();
    });
    (0, globals_1.it)('should prioritize a critical narrative correctly', async () => {
        // Mock Neo4j response for high graph score
        mockRun.mockResolvedValueOnce({
            records: [
                {
                    get: (key) => (key === 'graphScore' ? 4.5 : null),
                },
            ],
        });
        const input = {
            text: 'Urgent attack on infrastructure',
            entities: ['TargetA', 'TargetB'],
            source: 'high_value_source',
        };
        const result = await service.prioritize(input);
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.priority).toBeDefined();
        (0, globals_1.expect)(result.score).toBeGreaterThan(0);
        // Text score should be high due to "urgent", "attack", "infrastructure"
        // Graph score should be high (4.5/5 -> 0.9)
        // History score is deterministic 0-1
        (0, globals_1.expect)(mockRun).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('should handle empty entities gracefully', async () => {
        const input = {
            text: 'Just some random chatter',
            entities: [],
            source: 'random_source',
        };
        const result = await service.prioritize(input);
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(mockRun).not.toHaveBeenCalled(); // Should not query graph if no entities
    });
    (0, globals_1.it)('should handle graph query errors gracefully', async () => {
        mockRun.mockRejectedValueOnce(new Error('Neo4j error'));
        const input = {
            text: 'Test',
            entities: ['E1'],
            source: 'src',
        };
        const result = await service.prioritize(input);
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.breakdown.graphScore).toBe(0.1); // Fallback value
    });
});
