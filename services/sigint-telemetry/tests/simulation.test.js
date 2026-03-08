"use strict";
/**
 * Simulation tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const graph_js_1 = require("../src/simulation/graph.js");
const controls_js_1 = require("../src/simulation/controls.js");
(0, vitest_1.describe)('InfrastructureGraph', () => {
    (0, vitest_1.it)('should create empty graph', () => {
        const graph = new graph_js_1.InfrastructureGraph();
        (0, vitest_1.expect)(graph.getNodes().length).toBe(0);
    });
    (0, vitest_1.it)('should add nodes', () => {
        const graph = new graph_js_1.InfrastructureGraph();
        const node = graph.addNode({
            type: 'endpoint',
            name: 'test-endpoint',
            properties: {},
            controls: [],
        });
        (0, vitest_1.expect)(node.id).toBeDefined();
        (0, vitest_1.expect)(graph.getNodes().length).toBe(1);
    });
    (0, vitest_1.it)('should add edges between nodes', () => {
        const graph = new graph_js_1.InfrastructureGraph();
        const node1 = graph.addNode({
            type: 'identity',
            name: 'user',
            properties: {},
            controls: [],
        });
        const node2 = graph.addNode({
            type: 'endpoint',
            name: 'workstation',
            properties: {},
            controls: [],
        });
        const edge = graph.addEdge({
            type: 'can_authenticate',
            sourceId: node1.id,
            targetId: node2.id,
            properties: {},
            weight: 1,
        });
        (0, vitest_1.expect)(edge.id).toBeDefined();
        const neighbors = graph.getNeighbors(node1.id);
        (0, vitest_1.expect)(neighbors.length).toBe(1);
        (0, vitest_1.expect)(neighbors[0].id).toBe(node2.id);
    });
    (0, vitest_1.it)('should find paths between nodes', () => {
        const graph = new graph_js_1.InfrastructureGraph();
        const nodes = [
            graph.addNode({ type: 'identity', name: 'user', properties: {}, controls: [] }),
            graph.addNode({ type: 'endpoint', name: 'ws', properties: {}, controls: [] }),
            graph.addNode({ type: 'server', name: 'srv', properties: {}, controls: [] }),
            graph.addNode({ type: 'database', name: 'db', properties: {}, controls: [] }),
        ];
        graph.addEdge({ type: 'can_access', sourceId: nodes[0].id, targetId: nodes[1].id, properties: {}, weight: 1 });
        graph.addEdge({ type: 'network_reachable', sourceId: nodes[1].id, targetId: nodes[2].id, properties: {}, weight: 1 });
        graph.addEdge({ type: 'network_reachable', sourceId: nodes[2].id, targetId: nodes[3].id, properties: {}, weight: 1 });
        const path = graph.findPath(nodes[0].id, nodes[3].id);
        (0, vitest_1.expect)(path).not.toBeNull();
        (0, vitest_1.expect)(path?.length).toBe(4);
    });
    (0, vitest_1.it)('should calculate blast radius', () => {
        const graph = new graph_js_1.InfrastructureGraph();
        const nodes = [
            graph.addNode({ type: 'endpoint', name: 'ws1', properties: {}, controls: [] }),
            graph.addNode({ type: 'endpoint', name: 'ws2', properties: {}, controls: [] }),
            graph.addNode({ type: 'server', name: 'srv', properties: {}, controls: [] }),
        ];
        graph.addEdge({ type: 'network_reachable', sourceId: nodes[0].id, targetId: nodes[1].id, properties: {}, weight: 1 });
        graph.addEdge({ type: 'network_reachable', sourceId: nodes[0].id, targetId: nodes[2].id, properties: {}, weight: 1 });
        const blastRadius = graph.calculateBlastRadius(nodes[0].id);
        (0, vitest_1.expect)(blastRadius.size).toBe(3);
    });
    (0, vitest_1.it)('should track compromise state', () => {
        const graph = new graph_js_1.InfrastructureGraph();
        const node = graph.addNode({
            type: 'endpoint',
            name: 'target',
            properties: {},
            controls: [],
        });
        (0, vitest_1.expect)(node.compromised).toBe(false);
        graph.compromiseNode(node.id);
        (0, vitest_1.expect)(graph.getNode(node.id)?.compromised).toBe(true);
        graph.resetCompromise();
        (0, vitest_1.expect)(graph.getNode(node.id)?.compromised).toBe(false);
    });
});
(0, vitest_1.describe)('createSampleInfrastructure', () => {
    (0, vitest_1.it)('should create a valid sample infrastructure', () => {
        const graph = (0, graph_js_1.createSampleInfrastructure)();
        const stats = graph.getStats();
        (0, vitest_1.expect)(stats.nodeCount).toBeGreaterThan(0);
        (0, vitest_1.expect)(stats.edgeCount).toBeGreaterThan(0);
        (0, vitest_1.expect)(stats.nodesByType).toHaveProperty('identity');
        (0, vitest_1.expect)(stats.nodesByType).toHaveProperty('endpoint');
    });
});
(0, vitest_1.describe)('securityControls', () => {
    (0, vitest_1.it)('should have built-in controls', () => {
        (0, vitest_1.expect)(controls_js_1.securityControls.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should have valid control structure', () => {
        controls_js_1.securityControls.forEach((control) => {
            (0, vitest_1.expect)(control.id).toBeDefined();
            (0, vitest_1.expect)(control.name).toBeDefined();
            (0, vitest_1.expect)(control.effectiveness).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(control.effectiveness).toBeLessThanOrEqual(1);
            (0, vitest_1.expect)(control.mitigates.length).toBeGreaterThan(0);
        });
    });
});
(0, vitest_1.describe)('simulateControls', () => {
    (0, vitest_1.it)('should evaluate controls against techniques', () => {
        const result = (0, controls_js_1.simulateControls)('T1078', controls_js_1.securityControls);
        (0, vitest_1.expect)(result.technique).toBe('T1078');
        (0, vitest_1.expect)(result.controlsEvaluated.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.residualRisk).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(result.residualRisk).toBeLessThanOrEqual(1);
    });
    (0, vitest_1.it)('should identify blocking and detecting controls', () => {
        const result = (0, controls_js_1.simulateControls)('T1078', controls_js_1.securityControls);
        // At least one of these should be populated for a common technique
        (0, vitest_1.expect)(result.blockingControls.length > 0 || result.detectingControls.length > 0).toBe(true);
    });
});
(0, vitest_1.describe)('evaluateCampaignControls', () => {
    (0, vitest_1.it)('should evaluate multiple techniques', () => {
        const techniques = ['T1078', 'T1059', 'T1003'];
        const result = (0, controls_js_1.evaluateCampaignControls)(techniques, controls_js_1.securityControls);
        (0, vitest_1.expect)(result.results.length).toBe(3);
        (0, vitest_1.expect)(result.avgResidualRisk).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(result.avgResidualRisk).toBeLessThanOrEqual(1);
    });
});
(0, vitest_1.describe)('getControlsForTechnique', () => {
    (0, vitest_1.it)('should return controls that mitigate the technique', () => {
        const controls = (0, controls_js_1.getControlsForTechnique)('T1078');
        (0, vitest_1.expect)(controls.length).toBeGreaterThan(0);
        controls.forEach((c) => {
            (0, vitest_1.expect)(c.mitigates.includes('T1078') || c.mitigates.includes('*')).toBe(true);
        });
    });
});
