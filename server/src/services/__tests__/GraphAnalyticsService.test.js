"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CacheService_js_1 = require("../CacheService.js");
const mockRunCypher = globals_1.jest.fn();
globals_1.jest.mock('../../graph/neo4j', () => ({
    __esModule: true,
    runCypher: mockRunCypher,
    getDriver: globals_1.jest.fn(() => ({
        session: globals_1.jest.fn(() => ({
            close: globals_1.jest.fn()
        }))
    })),
}));
const GraphAnalyticsService_js_1 = require("../GraphAnalyticsService.js");
(0, globals_1.describe)('Neo4jGraphAnalyticsService', () => {
    let service;
    (0, globals_1.beforeAll)(() => {
        service = GraphAnalyticsService_js_1.Neo4jGraphAnalyticsService.getInstance();
        // Spy on cacheService singleton
        globals_1.jest.spyOn(CacheService_js_1.cacheService, 'getOrSet').mockImplementation(async (key, factory) => {
            return await factory();
        });
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('centrality', () => {
        globals_1.it.skip('should use cache and return centrality scores', async () => {
            const mockResult = [
                { entityId: 'e1', score: 10 }
            ];
            mockRunCypher.mockResolvedValue(mockResult);
            const results = await service.centrality({
                tenantId: 'test-tenant',
                scope: { investigationId: 'inv1' },
                algorithm: 'degree'
            });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].entityId).toBe('e1');
            (0, globals_1.expect)(CacheService_js_1.cacheService.getOrSet).toHaveBeenCalledWith(globals_1.expect.stringContaining('graph:centrality:test-tenant:degree:inv1'), globals_1.expect.any(Function), globals_1.expect.any(Number));
        });
    });
    (0, globals_1.describe)('communities', () => {
        globals_1.it.skip('should use cache and return communities', async () => {
            const mockResult = [
                { id1: 'e1', id2: 'e2', weight: 2 },
                { id1: 'e2', id2: 'e3', weight: 2 }
            ];
            mockRunCypher.mockResolvedValue(mockResult);
            const results = await service.communities({
                tenantId: 'test-tenant',
                scope: { investigationId: 'inv1' },
                algorithm: 'wcc'
            });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].entityIds).toHaveLength(3);
            (0, globals_1.expect)(CacheService_js_1.cacheService.getOrSet).toHaveBeenCalledWith(globals_1.expect.stringContaining('graph:communities:test-tenant:wcc:inv1'), globals_1.expect.any(Function), globals_1.expect.any(Number));
        });
    });
    (0, globals_1.describe)('detectAnomalies', () => {
        globals_1.it.skip('should detect degree anomalies with caching', async () => {
            const mockResult = [
                { entityId: 'e1', score: 10 }
            ];
            mockRunCypher.mockResolvedValue(mockResult);
            const results = await service.detectAnomalies({
                tenantId: 'test-tenant',
                scope: {},
                kind: 'degree'
            });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].entityId).toBe('e1');
            (0, globals_1.expect)(results[0].kind).toBe('degree');
            (0, globals_1.expect)(CacheService_js_1.cacheService.getOrSet).toHaveBeenCalled();
        });
    });
});
