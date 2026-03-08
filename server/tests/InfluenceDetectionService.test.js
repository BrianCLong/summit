"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const InfluenceDetectionService_js_1 = require("../src/services/InfluenceDetectionService.js");
const neo4j_js_1 = require("../src/graph/neo4j.js");
globals_1.jest.mock('../src/graph/neo4j.js', () => ({
    runCypher: globals_1.jest.fn(),
    getDriver: globals_1.jest.fn()
}));
(0, globals_1.describe)('InfluenceDetectionService', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should detect bots based on heuristics', async () => {
        const mockBots = [
            { id: '1', name: 'Bot1', ratio: 10.0 }
        ];
        neo4j_js_1.runCypher.mockResolvedValue(mockBots);
        const result = await InfluenceDetectionService_js_1.InfluenceDetectionService.detectBots('tenant-1');
        (0, globals_1.expect)(neo4j_js_1.runCypher).toHaveBeenCalledWith(globals_1.expect.stringContaining('ratio > 5.0'), globals_1.expect.objectContaining({ tenantId: 'tenant-1' }));
        (0, globals_1.expect)(result).toEqual(mockBots);
    });
    (0, globals_1.it)('should detect coordinated behavior', async () => {
        const mockCoordination = [
            { actor1: 'A', actor2: 'B', sharedTargets: 5 }
        ];
        neo4j_js_1.runCypher.mockResolvedValue(mockCoordination);
        const result = await InfluenceDetectionService_js_1.InfluenceDetectionService.detectCoordinatedBehavior('tenant-1', 30);
        (0, globals_1.expect)(neo4j_js_1.runCypher).toHaveBeenCalledWith(globals_1.expect.stringContaining('duration.inSeconds'), globals_1.expect.objectContaining({ tenantId: 'tenant-1', timeWindowMinutes: 30 }));
        (0, globals_1.expect)(result).toEqual(mockCoordination);
    });
});
