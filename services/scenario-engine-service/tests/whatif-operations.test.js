"use strict";
/**
 * WhatIfOperations Unit Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SandboxGraph_js_1 = require("../src/services/SandboxGraph.js");
const WhatIfOperations_js_1 = require("../src/services/WhatIfOperations.js");
(0, vitest_1.describe)('WhatIfOperations', () => {
    let sandboxGraph;
    let whatIfOps;
    (0, vitest_1.beforeEach)(() => {
        sandboxGraph = new SandboxGraph_js_1.SandboxGraph('test-scenario');
        whatIfOps = new WhatIfOperations_js_1.WhatIfOperations(sandboxGraph);
    });
    (0, vitest_1.describe)('Entity Operations', () => {
        (0, vitest_1.it)('should add an entity', async () => {
            const result = await whatIfOps.addEntity('Person', 'Alice', { role: 'analyst' });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.affectedNodeIds.length).toBe(1);
            (0, vitest_1.expect)(result.deltaSet.operations.length).toBe(1);
            (0, vitest_1.expect)(result.deltaSet.operations[0].type).toBe('add_node');
        });
        (0, vitest_1.it)('should remove an entity', async () => {
            const addResult = await whatIfOps.addEntity('Person', 'Bob');
            const nodeId = addResult.affectedNodeIds[0];
            const removeResult = await whatIfOps.removeEntity(nodeId);
            (0, vitest_1.expect)(removeResult.success).toBe(true);
            (0, vitest_1.expect)(removeResult.affectedNodeIds).toContain(nodeId);
            const node = await sandboxGraph.getNode(nodeId);
            (0, vitest_1.expect)(node).toBeUndefined();
        });
        (0, vitest_1.it)('should remove entity with cascading edge deletion', async () => {
            const person1 = await whatIfOps.addEntity('Person', 'Alice');
            const person2 = await whatIfOps.addEntity('Person', 'Bob');
            await whatIfOps.createRelationship(person1.affectedNodeIds[0], person2.affectedNodeIds[0], 'KNOWS');
            const stats = sandboxGraph.getStats();
            (0, vitest_1.expect)(stats.totalEdges).toBe(1);
            const removeResult = await whatIfOps.removeEntity(person1.affectedNodeIds[0]);
            (0, vitest_1.expect)(removeResult.success).toBe(true);
            (0, vitest_1.expect)(removeResult.affectedEdgeIds.length).toBe(1);
        });
    });
    (0, vitest_1.describe)('Relationship Operations', () => {
        (0, vitest_1.it)('should create a relationship', async () => {
            const person1 = await whatIfOps.addEntity('Person', 'Alice');
            const person2 = await whatIfOps.addEntity('Person', 'Bob');
            const result = await whatIfOps.createRelationship(person1.affectedNodeIds[0], person2.affectedNodeIds[0], 'WORKS_WITH', { since: 2020 });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.affectedEdgeIds.length).toBe(1);
            const edge = await sandboxGraph.getEdge(result.affectedEdgeIds[0]);
            (0, vitest_1.expect)(edge?.type).toBe('WORKS_WITH');
            (0, vitest_1.expect)(edge?.properties.since).toBe(2020);
        });
        (0, vitest_1.it)('should remove a relationship', async () => {
            const person1 = await whatIfOps.addEntity('Person', 'Alice');
            const person2 = await whatIfOps.addEntity('Person', 'Bob');
            const createResult = await whatIfOps.createRelationship(person1.affectedNodeIds[0], person2.affectedNodeIds[0], 'KNOWS');
            const edgeId = createResult.affectedEdgeIds[0];
            const removeResult = await whatIfOps.removeRelationship(edgeId);
            (0, vitest_1.expect)(removeResult.success).toBe(true);
            const edge = await sandboxGraph.getEdge(edgeId);
            (0, vitest_1.expect)(edge).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('Timing Operations', () => {
        (0, vitest_1.it)('should delay an event on a node', async () => {
            const result = await whatIfOps.addEntity('Event', 'Incident', { timestamp: 1000 });
            const nodeId = result.affectedNodeIds[0];
            const delayResult = await whatIfOps.delayEvent(nodeId, 'node', 500, 'timestamp');
            (0, vitest_1.expect)(delayResult.success).toBe(true);
            const node = await sandboxGraph.getNode(nodeId);
            (0, vitest_1.expect)(node?.properties.timestamp).toBe(1500);
        });
        (0, vitest_1.it)('should delay an event on an edge', async () => {
            const person1 = await whatIfOps.addEntity('Person', 'Alice');
            const person2 = await whatIfOps.addEntity('Person', 'Bob');
            await whatIfOps.execute({
                addEdge: {
                    sourceId: person1.affectedNodeIds[0],
                    targetId: person2.affectedNodeIds[0],
                    type: 'COMMUNICATED',
                    properties: { timestamp: 2000 },
                },
            });
            const edges = await sandboxGraph.getOutgoingEdges(person1.affectedNodeIds[0]);
            const edgeId = edges[0].id;
            const delayResult = await whatIfOps.delayEvent(edgeId, 'edge', 1000, 'timestamp');
            (0, vitest_1.expect)(delayResult.success).toBe(true);
            const edge = await sandboxGraph.getEdge(edgeId);
            (0, vitest_1.expect)(edge?.properties.timestamp).toBe(3000);
        });
    });
    (0, vitest_1.describe)('Rule Operations', () => {
        (0, vitest_1.it)('should enable a detection rule', async () => {
            const result = await whatIfOps.enableDetectionRule('rule-001', { threshold: 0.8 });
            (0, vitest_1.expect)(result.success).toBe(true);
            const rule = whatIfOps.getRuleById('rule-001');
            (0, vitest_1.expect)(rule).toBeDefined();
            (0, vitest_1.expect)(rule?.enabled).toBe(true);
            (0, vitest_1.expect)(rule?.parameters.threshold).toBe(0.8);
        });
        (0, vitest_1.it)('should disable a detection rule', async () => {
            await whatIfOps.enableDetectionRule('rule-002');
            const result = await whatIfOps.disableDetectionRule('rule-002');
            (0, vitest_1.expect)(result.success).toBe(true);
            const rule = whatIfOps.getRuleById('rule-002');
            (0, vitest_1.expect)(rule?.enabled).toBe(false);
        });
        (0, vitest_1.it)('should list enabled and disabled rules', async () => {
            await whatIfOps.enableDetectionRule('rule-a');
            await whatIfOps.enableDetectionRule('rule-b');
            await whatIfOps.disableDetectionRule('rule-c');
            const enabled = whatIfOps.getEnabledRules();
            const disabled = whatIfOps.getDisabledRules();
            const all = whatIfOps.getAllRules();
            (0, vitest_1.expect)(enabled.length).toBe(2);
            (0, vitest_1.expect)(disabled.length).toBe(1);
            (0, vitest_1.expect)(all.length).toBe(3);
        });
    });
    (0, vitest_1.describe)('Parameter Operations', () => {
        (0, vitest_1.it)('should set a scenario parameter', async () => {
            const result = await whatIfOps.setScenarioParameter('resourceBudget', 100000);
            (0, vitest_1.expect)(result.success).toBe(true);
            const value = whatIfOps.getParameter('resourceBudget');
            (0, vitest_1.expect)(value).toBe(100000);
        });
        (0, vitest_1.it)('should get all parameters', async () => {
            await whatIfOps.setScenarioParameter('param1', 'value1');
            await whatIfOps.setScenarioParameter('param2', 42);
            const params = whatIfOps.getAllParameters();
            (0, vitest_1.expect)(params.param1).toBe('value1');
            (0, vitest_1.expect)(params.param2).toBe(42);
        });
    });
    (0, vitest_1.describe)('Batch Operations', () => {
        (0, vitest_1.it)('should execute batch operations', async () => {
            const batchResult = await whatIfOps.executeBatch([
                { addNode: { labels: ['Person'], properties: { name: 'Alice' } } },
                { addNode: { labels: ['Person'], properties: { name: 'Bob' } } },
                { addNode: { labels: ['Organization'], properties: { name: 'Acme' } } },
            ], 'Create initial entities');
            (0, vitest_1.expect)(batchResult.totalOperations).toBe(3);
            (0, vitest_1.expect)(batchResult.successfulOperations).toBe(3);
            (0, vitest_1.expect)(batchResult.failedOperations).toBe(0);
            const stats = sandboxGraph.getStats();
            (0, vitest_1.expect)(stats.totalNodes).toBe(3);
        });
        (0, vitest_1.it)('should track partial failures in batch', async () => {
            const person = await whatIfOps.addEntity('Person', 'Alice');
            const batchResult = await whatIfOps.executeBatch([
                { addNode: { labels: ['Person'], properties: { name: 'Bob' } } },
                { removeNode: { nodeId: 'non-existent', cascade: true } },
            ], 'Mixed batch');
            (0, vitest_1.expect)(batchResult.successfulOperations).toBe(1);
            (0, vitest_1.expect)(batchResult.failedOperations).toBe(1);
        });
    });
    (0, vitest_1.describe)('Complex Operations', () => {
        (0, vitest_1.it)('should add node with connections', async () => {
            const person1 = await whatIfOps.addEntity('Person', 'Alice');
            const person2 = await whatIfOps.addEntity('Person', 'Bob');
            const result = await whatIfOps.execute({
                addNode: {
                    labels: ['Person'],
                    properties: { name: 'Charlie' },
                    connectTo: [
                        { nodeId: person1.affectedNodeIds[0], edgeType: 'KNOWS', direction: 'outgoing' },
                        { nodeId: person2.affectedNodeIds[0], edgeType: 'WORKS_WITH', direction: 'incoming' },
                    ],
                },
            });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.affectedNodeIds.length).toBe(1);
            (0, vitest_1.expect)(result.affectedEdgeIds.length).toBe(2);
            const stats = sandboxGraph.getStats();
            (0, vitest_1.expect)(stats.totalNodes).toBe(3);
            (0, vitest_1.expect)(stats.totalEdges).toBe(2);
        });
        (0, vitest_1.it)('should connect existing nodes', async () => {
            const person1 = await whatIfOps.addEntity('Person', 'Alice');
            const person2 = await whatIfOps.addEntity('Person', 'Bob');
            const connectResult = await whatIfOps.connectNodes(person1.affectedNodeIds[0], person2.affectedNodeIds[0], 'COLLABORATES', true // bidirectional
            );
            (0, vitest_1.expect)(connectResult.totalOperations).toBe(2);
            (0, vitest_1.expect)(connectResult.successfulOperations).toBe(2);
            const stats = sandboxGraph.getStats();
            (0, vitest_1.expect)(stats.totalEdges).toBe(2);
        });
        (0, vitest_1.it)('should isolate a subgraph', async () => {
            const node1 = await whatIfOps.addEntity('Person', 'Alice');
            const node2 = await whatIfOps.addEntity('Person', 'Bob');
            const node3 = await whatIfOps.addEntity('Person', 'Charlie');
            const node4 = await whatIfOps.addEntity('Person', 'David');
            // Create edges
            await whatIfOps.createRelationship(node1.affectedNodeIds[0], node2.affectedNodeIds[0], 'KNOWS');
            await whatIfOps.createRelationship(node2.affectedNodeIds[0], node3.affectedNodeIds[0], 'KNOWS');
            await whatIfOps.createRelationship(node3.affectedNodeIds[0], node4.affectedNodeIds[0], 'KNOWS');
            // Isolate node1 and node2
            await whatIfOps.isolateSubgraph([
                node1.affectedNodeIds[0],
                node2.affectedNodeIds[0],
            ]);
            // Edge between 1 and 2 should remain
            const edges12 = await sandboxGraph.getOutgoingEdges(node1.affectedNodeIds[0]);
            (0, vitest_1.expect)(edges12.length).toBe(1);
            // Edge from 2 to 3 should be removed (3 is outside the subgraph)
            const edges23 = await sandboxGraph.getOutgoingEdges(node2.affectedNodeIds[0]);
            (0, vitest_1.expect)(edges23.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('Rollback', () => {
        (0, vitest_1.it)('should rollback a delta set', async () => {
            const addResult = await whatIfOps.addEntity('Person', 'Alice');
            const nodeId = addResult.affectedNodeIds[0];
            // Verify node exists
            let node = await sandboxGraph.getNode(nodeId);
            (0, vitest_1.expect)(node).toBeDefined();
            // Rollback
            await whatIfOps.rollback(addResult.deltaSet);
            // Verify node is removed
            node = await sandboxGraph.getNode(nodeId);
            (0, vitest_1.expect)(node).toBeUndefined();
        });
        (0, vitest_1.it)('should rollback multiple operations', async () => {
            const person1 = await whatIfOps.addEntity('Person', 'Alice');
            const person2 = await whatIfOps.addEntity('Person', 'Bob');
            const relResult = await whatIfOps.createRelationship(person1.affectedNodeIds[0], person2.affectedNodeIds[0], 'KNOWS');
            // Rollback relationship
            await whatIfOps.rollback(relResult.deltaSet);
            const stats = sandboxGraph.getStats();
            (0, vitest_1.expect)(stats.totalNodes).toBe(2);
            (0, vitest_1.expect)(stats.totalEdges).toBe(0);
        });
        (0, vitest_1.it)('should rollback rule changes', async () => {
            const enableResult = await whatIfOps.enableDetectionRule('rule-x', { sensitivity: 'high' });
            (0, vitest_1.expect)(whatIfOps.getRuleById('rule-x')?.enabled).toBe(true);
            await whatIfOps.rollback(enableResult.deltaSet);
            // Rule should be removed or not exist after rollback
            (0, vitest_1.expect)(whatIfOps.getRuleById('rule-x')).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('Delta Sets', () => {
        (0, vitest_1.it)('should create reversible delta sets', async () => {
            const result = await whatIfOps.addEntity('Person', 'Alice', { age: 30 });
            (0, vitest_1.expect)(result.deltaSet.id).toBeDefined();
            (0, vitest_1.expect)(result.deltaSet.scenarioId).toBe('test-scenario');
            (0, vitest_1.expect)(result.deltaSet.applied).toBe(true);
            (0, vitest_1.expect)(result.deltaSet.rollbackAvailable).toBe(true);
            (0, vitest_1.expect)(result.deltaSet.operations.length).toBe(1);
        });
        (0, vitest_1.it)('should track before/after state in operations', async () => {
            const addResult = await whatIfOps.addEntity('Person', 'Alice');
            const nodeId = addResult.affectedNodeIds[0];
            const updateResult = await whatIfOps.execute({
                updateNode: {
                    nodeId,
                    properties: { age: 25 },
                },
            });
            const updateOp = updateResult.deltaSet.operations[0];
            (0, vitest_1.expect)(updateOp.before).toBeDefined();
            (0, vitest_1.expect)(updateOp.after).toBeDefined();
            (0, vitest_1.expect)(updateOp.after.properties.age).toBe(25);
        });
    });
});
