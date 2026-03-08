"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const graph_database_1 = require("@intelgraph/graph-database");
const PathFinding_js_1 = require("../pathfinding/PathFinding.js");
const CentralityMetrics_js_1 = require("../centrality/CentralityMetrics.js");
const CommunityDetection_js_1 = require("../community/CommunityDetection.js");
(0, vitest_1.describe)('Graph Algorithms', () => {
    let storage;
    (0, vitest_1.beforeEach)(() => {
        storage = new graph_database_1.GraphStorage();
    });
    (0, vitest_1.describe)('PathFinding', () => {
        (0, vitest_1.it)('should find shortest path with Dijkstra', () => {
            const a = storage.addNode('Node', { name: 'A' });
            const b = storage.addNode('Node', { name: 'B' });
            const c = storage.addNode('Node', { name: 'C' });
            storage.addEdge(a.id, b.id, 'CONNECTS', { weight: 1 });
            storage.addEdge(b.id, c.id, 'CONNECTS', { weight: 1 });
            storage.addEdge(a.id, c.id, 'CONNECTS', { weight: 5 });
            const pathFinding = new PathFinding_js_1.PathFinding(storage);
            const result = pathFinding.dijkstra(a.id, c.id);
            (0, vitest_1.expect)(result.path.length).toBe(3);
            (0, vitest_1.expect)(result.distance).toBe(2);
        });
        (0, vitest_1.it)('should find all paths between nodes', () => {
            const a = storage.addNode('Node', { name: 'A' });
            const b = storage.addNode('Node', { name: 'B' });
            const c = storage.addNode('Node', { name: 'C' });
            storage.addEdge(a.id, b.id, 'CONNECTS');
            storage.addEdge(b.id, c.id, 'CONNECTS');
            storage.addEdge(a.id, c.id, 'CONNECTS');
            const pathFinding = new PathFinding_js_1.PathFinding(storage);
            const paths = pathFinding.findAllPaths(a.id, c.id, 3);
            (0, vitest_1.expect)(paths.length).toBeGreaterThanOrEqual(2);
        });
    });
    (0, vitest_1.describe)('Centrality Metrics', () => {
        (0, vitest_1.it)('should calculate degree centrality', () => {
            const hub = storage.addNode('Node', { name: 'Hub' });
            const n1 = storage.addNode('Node', { name: 'N1' });
            const n2 = storage.addNode('Node', { name: 'N2' });
            const n3 = storage.addNode('Node', { name: 'N3' });
            storage.addEdge(hub.id, n1.id, 'CONNECTS');
            storage.addEdge(hub.id, n2.id, 'CONNECTS');
            storage.addEdge(hub.id, n3.id, 'CONNECTS');
            const centrality = new CentralityMetrics_js_1.CentralityMetrics(storage);
            const degrees = centrality.degreeCentrality();
            (0, vitest_1.expect)(degrees.get(hub.id)).toBeGreaterThan(degrees.get(n1.id) || 0);
        });
        (0, vitest_1.it)('should calculate PageRank', () => {
            const a = storage.addNode('Node', { name: 'A' });
            const b = storage.addNode('Node', { name: 'B' });
            const c = storage.addNode('Node', { name: 'C' });
            storage.addEdge(a.id, b.id, 'LINKS');
            storage.addEdge(c.id, b.id, 'LINKS');
            const centrality = new CentralityMetrics_js_1.CentralityMetrics(storage);
            const pageRank = centrality.pageRank();
            // B should have highest PageRank (most inbound links)
            (0, vitest_1.expect)(pageRank.get(b.id)).toBeGreaterThan(pageRank.get(a.id) || 0);
        });
    });
    (0, vitest_1.describe)('Community Detection', () => {
        (0, vitest_1.it)('should detect communities with Label Propagation', () => {
            // Create two clusters
            const a1 = storage.addNode('Node', { cluster: 1 });
            const a2 = storage.addNode('Node', { cluster: 1 });
            const a3 = storage.addNode('Node', { cluster: 1 });
            const b1 = storage.addNode('Node', { cluster: 2 });
            const b2 = storage.addNode('Node', { cluster: 2 });
            const b3 = storage.addNode('Node', { cluster: 2 });
            // Dense connections within clusters
            storage.addEdge(a1.id, a2.id, 'CONNECTS');
            storage.addEdge(a2.id, a3.id, 'CONNECTS');
            storage.addEdge(a1.id, a3.id, 'CONNECTS');
            storage.addEdge(b1.id, b2.id, 'CONNECTS');
            storage.addEdge(b2.id, b3.id, 'CONNECTS');
            storage.addEdge(b1.id, b3.id, 'CONNECTS');
            // Single connection between clusters
            storage.addEdge(a1.id, b1.id, 'CONNECTS');
            const community = new CommunityDetection_js_1.CommunityDetection(storage);
            const communities = community.labelPropagation();
            (0, vitest_1.expect)(communities.size).toBeGreaterThan(0);
        });
    });
});
