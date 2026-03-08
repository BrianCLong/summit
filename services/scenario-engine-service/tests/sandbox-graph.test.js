"use strict";
/**
 * SandboxGraph Unit Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SandboxGraph_js_1 = require("../src/services/SandboxGraph.js");
(0, vitest_1.describe)('SandboxGraph', () => {
    let sandboxGraph;
    (0, vitest_1.beforeEach)(() => {
        sandboxGraph = new SandboxGraph_js_1.SandboxGraph('test-scenario-1');
    });
    (0, vitest_1.describe)('Node Operations', () => {
        (0, vitest_1.it)('should add a node with labels and properties', () => {
            const node = sandboxGraph.addNode(['Person'], { name: 'Alice', age: 30 });
            (0, vitest_1.expect)(node.id).toBeDefined();
            (0, vitest_1.expect)(node.labels).toEqual(['Person']);
            (0, vitest_1.expect)(node.properties.name).toBe('Alice');
            (0, vitest_1.expect)(node.properties.age).toBe(30);
            (0, vitest_1.expect)(node.isOriginal).toBe(false);
            (0, vitest_1.expect)(node.modifiedInScenario).toBe(true);
        });
        (0, vitest_1.it)('should retrieve a node by id', async () => {
            const created = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            const retrieved = await sandboxGraph.getNode(created.id);
            (0, vitest_1.expect)(retrieved).toBeDefined();
            (0, vitest_1.expect)(retrieved?.id).toBe(created.id);
            (0, vitest_1.expect)(retrieved?.properties.name).toBe('Bob');
        });
        (0, vitest_1.it)('should update a node properties', async () => {
            const node = sandboxGraph.addNode(['Person'], { name: 'Charlie' });
            const updated = await sandboxGraph.updateNode(node.id, { age: 25 });
            (0, vitest_1.expect)(updated).toBeDefined();
            (0, vitest_1.expect)(updated?.properties.name).toBe('Charlie');
            (0, vitest_1.expect)(updated?.properties.age).toBe(25);
            (0, vitest_1.expect)(updated?.version).toBe(2);
        });
        (0, vitest_1.it)('should remove a node', async () => {
            const node = sandboxGraph.addNode(['Person'], { name: 'David' });
            const removed = await sandboxGraph.removeNode(node.id);
            (0, vitest_1.expect)(removed).toBe(true);
            const retrieved = await sandboxGraph.getNode(node.id);
            (0, vitest_1.expect)(retrieved).toBeUndefined();
        });
        (0, vitest_1.it)('should track node statistics', () => {
            sandboxGraph.addNode(['Person'], { name: 'Eve' });
            sandboxGraph.addNode(['Person'], { name: 'Frank' });
            sandboxGraph.addNode(['Organization'], { name: 'Acme Corp' });
            const stats = sandboxGraph.getStats();
            (0, vitest_1.expect)(stats.totalNodes).toBe(3);
            (0, vitest_1.expect)(stats.addedNodes).toBe(3);
        });
    });
    (0, vitest_1.describe)('Edge Operations', () => {
        (0, vitest_1.it)('should add an edge between two nodes', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            const edge = await sandboxGraph.addEdge(node1.id, node2.id, 'KNOWS', { since: 2020 }, 0.8);
            (0, vitest_1.expect)(edge).toBeDefined();
            (0, vitest_1.expect)(edge?.sourceId).toBe(node1.id);
            (0, vitest_1.expect)(edge?.targetId).toBe(node2.id);
            (0, vitest_1.expect)(edge?.type).toBe('KNOWS');
            (0, vitest_1.expect)(edge?.properties.since).toBe(2020);
            (0, vitest_1.expect)(edge?.weight).toBe(0.8);
        });
        (0, vitest_1.it)('should not add edge with non-existent endpoints', async () => {
            const node = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            await (0, vitest_1.expect)(sandboxGraph.addEdge(node.id, 'non-existent', 'KNOWS')).rejects.toThrow();
        });
        (0, vitest_1.it)('should update edge properties and weight', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            const edge = await sandboxGraph.addEdge(node1.id, node2.id, 'KNOWS');
            const updated = await sandboxGraph.updateEdge(edge.id, { strength: 'strong' }, 0.9);
            (0, vitest_1.expect)(updated?.properties.strength).toBe('strong');
            (0, vitest_1.expect)(updated?.weight).toBe(0.9);
            (0, vitest_1.expect)(updated?.version).toBe(2);
        });
        (0, vitest_1.it)('should remove an edge', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            const edge = await sandboxGraph.addEdge(node1.id, node2.id, 'KNOWS');
            const removed = await sandboxGraph.removeEdge(edge.id);
            (0, vitest_1.expect)(removed).toBe(true);
            const retrieved = await sandboxGraph.getEdge(edge.id);
            (0, vitest_1.expect)(retrieved).toBeUndefined();
        });
        (0, vitest_1.it)('should cascade delete edges when removing a node', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            const node3 = sandboxGraph.addNode(['Person'], { name: 'Charlie' });
            const edge1 = await sandboxGraph.addEdge(node1.id, node2.id, 'KNOWS');
            const edge2 = await sandboxGraph.addEdge(node1.id, node3.id, 'KNOWS');
            await sandboxGraph.removeNode(node1.id, true);
            const retrieved1 = await sandboxGraph.getEdge(edge1.id);
            const retrieved2 = await sandboxGraph.getEdge(edge2.id);
            (0, vitest_1.expect)(retrieved1).toBeUndefined();
            (0, vitest_1.expect)(retrieved2).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('Graph Traversal', () => {
        (0, vitest_1.it)('should get outgoing edges', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            const node3 = sandboxGraph.addNode(['Person'], { name: 'Charlie' });
            await sandboxGraph.addEdge(node1.id, node2.id, 'KNOWS');
            await sandboxGraph.addEdge(node1.id, node3.id, 'WORKS_WITH');
            const outgoing = await sandboxGraph.getOutgoingEdges(node1.id);
            (0, vitest_1.expect)(outgoing.length).toBe(2);
        });
        (0, vitest_1.it)('should get incoming edges', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            const node3 = sandboxGraph.addNode(['Person'], { name: 'Charlie' });
            await sandboxGraph.addEdge(node1.id, node3.id, 'KNOWS');
            await sandboxGraph.addEdge(node2.id, node3.id, 'KNOWS');
            const incoming = await sandboxGraph.getIncomingEdges(node3.id);
            (0, vitest_1.expect)(incoming.length).toBe(2);
        });
        (0, vitest_1.it)('should get neighbors', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            const node3 = sandboxGraph.addNode(['Person'], { name: 'Charlie' });
            await sandboxGraph.addEdge(node1.id, node2.id, 'KNOWS');
            await sandboxGraph.addEdge(node3.id, node1.id, 'KNOWS');
            const neighbors = await sandboxGraph.getNeighbors(node1.id);
            (0, vitest_1.expect)(neighbors.length).toBe(2);
            (0, vitest_1.expect)(neighbors.map(n => n.properties.name)).toContain('Bob');
            (0, vitest_1.expect)(neighbors.map(n => n.properties.name)).toContain('Charlie');
        });
        (0, vitest_1.it)('should calculate degree', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Hub' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Spoke1' });
            const node3 = sandboxGraph.addNode(['Person'], { name: 'Spoke2' });
            const node4 = sandboxGraph.addNode(['Person'], { name: 'Spoke3' });
            await sandboxGraph.addEdge(node1.id, node2.id, 'CONNECTS');
            await sandboxGraph.addEdge(node1.id, node3.id, 'CONNECTS');
            await sandboxGraph.addEdge(node4.id, node1.id, 'CONNECTS');
            const outDegree = await sandboxGraph.getDegree(node1.id, 'out');
            const inDegree = await sandboxGraph.getDegree(node1.id, 'in');
            const totalDegree = await sandboxGraph.getDegree(node1.id, 'both');
            (0, vitest_1.expect)(outDegree).toBe(2);
            (0, vitest_1.expect)(inDegree).toBe(1);
            (0, vitest_1.expect)(totalDegree).toBe(3);
        });
    });
    (0, vitest_1.describe)('Template Creation', () => {
        (0, vitest_1.it)('should create from template', async () => {
            const templateNodes = [
                {
                    id: 'n1',
                    labels: ['Person'],
                    properties: { name: 'Alice' },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1,
                    deleted: false,
                    isOriginal: false,
                    modifiedInScenario: false,
                },
                {
                    id: 'n2',
                    labels: ['Person'],
                    properties: { name: 'Bob' },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1,
                    deleted: false,
                    isOriginal: false,
                    modifiedInScenario: false,
                },
            ];
            const templateEdges = [
                {
                    id: 'e1',
                    type: 'KNOWS',
                    sourceId: 'n1',
                    targetId: 'n2',
                    properties: {},
                    weight: 1,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1,
                    deleted: false,
                    isOriginal: false,
                    modifiedInScenario: false,
                },
            ];
            await sandboxGraph.createFromTemplate({
                nodes: templateNodes,
                edges: templateEdges,
            });
            const stats = sandboxGraph.getStats();
            (0, vitest_1.expect)(stats.totalNodes).toBe(2);
            (0, vitest_1.expect)(stats.totalEdges).toBe(1);
            const alice = await sandboxGraph.getNode('n1');
            (0, vitest_1.expect)(alice?.properties.name).toBe('Alice');
        });
    });
    (0, vitest_1.describe)('Graph Cloning', () => {
        (0, vitest_1.it)('should clone a sandbox graph', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            await sandboxGraph.addEdge(node1.id, node2.id, 'KNOWS');
            const cloned = sandboxGraph.clone('cloned-scenario');
            (0, vitest_1.expect)(cloned.getScenarioId()).toBe('cloned-scenario');
            (0, vitest_1.expect)(cloned.getGraphId()).not.toBe(sandboxGraph.getGraphId());
            const clonedStats = cloned.getStats();
            (0, vitest_1.expect)(clonedStats.totalNodes).toBe(2);
            (0, vitest_1.expect)(clonedStats.totalEdges).toBe(1);
        });
        (0, vitest_1.it)('should allow independent modifications after cloning', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            sandboxGraph.addNode(['Person'], { name: 'Bob' });
            const cloned = sandboxGraph.clone('cloned-scenario');
            // Modify original
            await sandboxGraph.updateNode(node1.id, { age: 30 });
            // Check original is modified
            const originalNode = await sandboxGraph.getNode(node1.id);
            (0, vitest_1.expect)(originalNode?.properties.age).toBe(30);
            // Check clone is not affected (has the original data from clone time)
            const clonedNode = await cloned.getNode(node1.id);
            (0, vitest_1.expect)(clonedNode?.properties.age).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('Export', () => {
        (0, vitest_1.it)('should export the complete graph', async () => {
            const node1 = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            const node2 = sandboxGraph.addNode(['Person'], { name: 'Bob' });
            await sandboxGraph.addEdge(node1.id, node2.id, 'KNOWS');
            const exported = await sandboxGraph.exportGraph();
            (0, vitest_1.expect)(exported.nodes.length).toBe(2);
            (0, vitest_1.expect)(exported.edges.length).toBe(1);
        });
    });
    (0, vitest_1.describe)('Limits', () => {
        (0, vitest_1.it)('should enforce node limit', () => {
            const limitedGraph = new SandboxGraph_js_1.SandboxGraph('limited', undefined, { maxNodes: 3 });
            limitedGraph.addNode(['Type'], {});
            limitedGraph.addNode(['Type'], {});
            limitedGraph.addNode(['Type'], {});
            (0, vitest_1.expect)(() => limitedGraph.addNode(['Type'], {})).toThrow(/limit/i);
        });
        (0, vitest_1.it)('should enforce edge limit', async () => {
            const limitedGraph = new SandboxGraph_js_1.SandboxGraph('limited', undefined, { maxEdges: 2 });
            const n1 = limitedGraph.addNode(['Type'], {});
            const n2 = limitedGraph.addNode(['Type'], {});
            const n3 = limitedGraph.addNode(['Type'], {});
            const n4 = limitedGraph.addNode(['Type'], {});
            await limitedGraph.addEdge(n1.id, n2.id, 'REL');
            await limitedGraph.addEdge(n2.id, n3.id, 'REL');
            await (0, vitest_1.expect)(limitedGraph.addEdge(n3.id, n4.id, 'REL')).rejects.toThrow(/limit/i);
        });
    });
    (0, vitest_1.describe)('Audit Log', () => {
        (0, vitest_1.it)('should track operations in audit log', async () => {
            const node = sandboxGraph.addNode(['Person'], { name: 'Alice' });
            await sandboxGraph.updateNode(node.id, { age: 30 });
            await sandboxGraph.removeNode(node.id);
            const auditLog = sandboxGraph.getAuditLog();
            (0, vitest_1.expect)(auditLog.length).toBe(3);
            (0, vitest_1.expect)(auditLog[0].type).toBe('add_node');
            (0, vitest_1.expect)(auditLog[1].type).toBe('update_node');
            (0, vitest_1.expect)(auditLog[2].type).toBe('remove_node');
        });
    });
});
(0, vitest_1.describe)('SandboxGraph with SourceProvider', () => {
    (0, vitest_1.it)('should use copy-on-write for source nodes', async () => {
        const sourceNodes = new Map();
        const sourceEdges = new Map();
        // Create source data
        const sourceNode = {
            id: 'source-node-1',
            labels: ['Person'],
            properties: { name: 'SourceAlice' },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            deleted: false,
            isOriginal: true,
            modifiedInScenario: false,
        };
        sourceNodes.set(sourceNode.id, sourceNode);
        // Create mock provider
        const mockProvider = {
            getNode: async (id) => sourceNodes.get(id),
            getEdge: async (id) => sourceEdges.get(id),
            getNodesByLabel: async () => [],
            getEdgesByType: async () => [],
            getOutgoingEdges: async () => [],
            getIncomingEdges: async () => [],
            getNeighbors: async () => ({ nodes: [sourceNode], edges: [] }),
        };
        const sandbox = new SandboxGraph_js_1.SandboxGraph('test', mockProvider);
        await sandbox.createFromNodes(['source-node-1'], { includeNeighbors: true, neighborDepth: 1 });
        // Get source node (should be from provider)
        const retrieved = await sandbox.getNode('source-node-1');
        (0, vitest_1.expect)(retrieved?.properties.name).toBe('SourceAlice');
        // Update node (should copy-on-write)
        const updated = await sandbox.updateNode('source-node-1', { age: 25 });
        (0, vitest_1.expect)(updated?.properties.age).toBe(25);
        (0, vitest_1.expect)(updated?.modifiedInScenario).toBe(true);
        // Original source should be unchanged
        (0, vitest_1.expect)(sourceNodes.get('source-node-1')?.properties.age).toBeUndefined();
    });
});
