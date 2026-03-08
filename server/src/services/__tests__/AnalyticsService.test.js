"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AnalyticsService_js_1 = require("../AnalyticsService.js");
const globals_1 = require("@jest/globals");
// Mock runCypher
globals_1.jest.mock('../../graph/neo4j.js', () => ({
    runCypher: globals_1.jest.fn(),
    getDriver: globals_1.jest.fn().mockReturnValue({
        session: globals_1.jest.fn().mockReturnValue({
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn()
        })
    })
}));
const neo4j_js_1 = require("../../graph/neo4j.js");
const runCypherMock = neo4j_js_1.runCypher;
describe('AnalyticsService', () => {
    let service;
    beforeEach(() => {
        service = AnalyticsService_js_1.AnalyticsService.getInstance();
        runCypherMock.mockClear();
    });
    describe('findPaths', () => {
        it('should calculate shortest paths correctly', async () => {
            const mockResult = [
                { nodeIds: ['1', '2'], relTypes: ['CONNECTED'], cost: 1 }
            ];
            runCypherMock.mockResolvedValue(mockResult);
            const result = await service.findPaths('1', '2', 'shortest');
            expect(neo4j_js_1.runCypher).toHaveBeenCalledWith(expect.stringContaining('shortestPath'), expect.objectContaining({ sourceId: '1', targetId: '2' }));
            expect(result.data).toEqual(mockResult);
            expect(result.xai.explanation).toContain('unweighted shortest path');
        });
        it('should validate inputs', async () => {
            await expect(service.findPaths('1', '2', 'shortest', { k: 'invalid' }))
                .rejects.toThrow();
        });
    });
    describe('detectCommunities', () => {
        it('should return community detection results via client-side components', async () => {
            const mockNodes = [
                { nodeId: '1', neighbors: ['2'] },
                { nodeId: '2', neighbors: ['1'] },
                { nodeId: '3', neighbors: [] }
            ];
            runCypherMock.mockResolvedValue(mockNodes);
            const result = await service.detectCommunities('lpa');
            expect(result.data.length).toBeGreaterThan(0);
            expect(result.xai.metrics.communityCount).toBe(2); // {1,2} and {3}
        });
    });
    describe('minePatterns', () => {
        it('should find temporal motifs', async () => {
            const mockResult = [{ nodeId: '1', eventCount: 10 }];
            runCypherMock.mockResolvedValue(mockResult);
            const result = await service.minePatterns('temporal-motifs');
            expect(neo4j_js_1.runCypher).toHaveBeenCalledWith(expect.stringContaining('timestamp'), expect.anything());
            expect(result.xai.features.patternType).toBe('temporal-motifs');
        });
    });
    describe('detectAnomalies', () => {
        it('should detect degree anomalies', async () => {
            runCypherMock.mockResolvedValue([{ nodeId: '1', degree: 100 }]);
            const result = await service.detectAnomalies('degree');
            expect(neo4j_js_1.runCypher).toHaveBeenCalledWith(expect.stringContaining('degree > 50'), expect.anything());
            expect(result.xai.explanation).toContain('Nodes exceeding');
        });
    });
});
