"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const algorithms_js_1 = require("../src/graph/algorithms.js");
const neo4j_js_1 = require("../src/graph/neo4j.js");
globals_1.jest.mock('../src/graph/neo4j.js', () => ({
    runCypher: globals_1.jest.fn(),
    getDriver: globals_1.jest.fn()
}));
(0, globals_1.describe)('Graph Algorithms', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should calculate degree centrality', async () => {
        const mockResult = [
            { id: '1', name: 'Node A', degree: 10 },
            { id: '2', name: 'Node B', degree: 5 }
        ];
        neo4j_js_1.runCypher.mockResolvedValue(mockResult);
        const result = await (0, algorithms_js_1.calculateDegreeCentrality)('tenant-1');
        (0, globals_1.expect)(neo4j_js_1.runCypher).toHaveBeenCalledWith(globals_1.expect.stringContaining('MATCH (n)'), globals_1.expect.objectContaining({ tenantId: 'tenant-1' }));
        (0, globals_1.expect)(result).toEqual(mockResult);
    });
    (0, globals_1.it)('should find shortest path', async () => {
        const mockPath = [{ nodes: [], relationships: [], length: 2 }];
        neo4j_js_1.runCypher.mockResolvedValue(mockPath);
        const result = await (0, algorithms_js_1.findShortestPath)('tenant-1', 'start', 'end');
        (0, globals_1.expect)(neo4j_js_1.runCypher).toHaveBeenCalledWith(globals_1.expect.stringContaining('shortestPath'), globals_1.expect.objectContaining({
            tenantId: 'tenant-1',
            startNodeId: 'start',
            endNodeId: 'end'
        }));
        (0, globals_1.expect)(result).toEqual(mockPath);
    });
});
