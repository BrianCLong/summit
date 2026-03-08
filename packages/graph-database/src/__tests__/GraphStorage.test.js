"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GraphStorage_js_1 = require("../storage/GraphStorage.js");
(0, vitest_1.describe)('GraphStorage', () => {
    let storage;
    (0, vitest_1.beforeEach)(() => {
        storage = new GraphStorage_js_1.GraphStorage();
    });
    (0, vitest_1.describe)('Node Operations', () => {
        (0, vitest_1.it)('should add and retrieve a node', () => {
            const node = storage.addNode('Person', { name: 'Alice', age: 30 });
            (0, vitest_1.expect)(node.labels).toContain('Person');
            (0, vitest_1.expect)(node.properties.name).toBe('Alice');
            const retrieved = storage.getNode(node.id);
            (0, vitest_1.expect)(retrieved).toEqual(node);
        });
        (0, vitest_1.it)('should update node properties', () => {
            const node = storage.addNode('Person', { name: 'Bob' });
            const updated = storage.updateNode(node.id, { name: 'Robert', age: 25 });
            (0, vitest_1.expect)(updated?.properties.name).toBe('Robert');
            (0, vitest_1.expect)(updated?.properties.age).toBe(25);
        });
        (0, vitest_1.it)('should delete a node', () => {
            const node = storage.addNode('Person', { name: 'Charlie' });
            const deleted = storage.deleteNode(node.id);
            (0, vitest_1.expect)(deleted).toBe(true);
            (0, vitest_1.expect)(storage.getNode(node.id)).toBeUndefined();
        });
        (0, vitest_1.it)('should find nodes by label', () => {
            storage.addNode('Person', { name: 'Alice' });
            storage.addNode('Person', { name: 'Bob' });
            storage.addNode('Company', { name: 'Acme' });
            const people = storage.findNodesByLabel('Person');
            (0, vitest_1.expect)(people.length).toBe(2);
        });
        (0, vitest_1.it)('should find nodes by property', () => {
            storage.addNode('Person', { name: 'Alice', city: 'NYC' });
            storage.addNode('Person', { name: 'Bob', city: 'LA' });
            const nycResidents = storage.findNodesByProperty('city', 'NYC');
            (0, vitest_1.expect)(nycResidents.length).toBe(1);
            (0, vitest_1.expect)(nycResidents[0].properties.name).toBe('Alice');
        });
    });
    (0, vitest_1.describe)('Edge Operations', () => {
        let alice;
        let bob;
        (0, vitest_1.beforeEach)(() => {
            alice = storage.addNode('Person', { name: 'Alice' });
            bob = storage.addNode('Person', { name: 'Bob' });
        });
        (0, vitest_1.it)('should add and retrieve an edge', () => {
            const edge = storage.addEdge(alice.id, bob.id, 'KNOWS', { since: 2020 });
            (0, vitest_1.expect)(edge.type).toBe('KNOWS');
            (0, vitest_1.expect)(edge.source).toBe(alice.id);
            (0, vitest_1.expect)(edge.target).toBe(bob.id);
            const retrieved = storage.getEdge(edge.id);
            (0, vitest_1.expect)(retrieved).toEqual(edge);
        });
        (0, vitest_1.it)('should get neighbors of a node', () => {
            const charlie = storage.addNode('Person', { name: 'Charlie' });
            storage.addEdge(alice.id, bob.id, 'KNOWS');
            storage.addEdge(alice.id, charlie.id, 'KNOWS');
            const neighbors = storage.getNeighbors(alice.id);
            (0, vitest_1.expect)(neighbors.length).toBe(2);
        });
        (0, vitest_1.it)('should get outgoing edges', () => {
            storage.addEdge(alice.id, bob.id, 'KNOWS');
            storage.addEdge(bob.id, alice.id, 'FOLLOWS');
            const outgoing = storage.getOutgoingEdges(alice.id);
            (0, vitest_1.expect)(outgoing.length).toBe(1);
            (0, vitest_1.expect)(outgoing[0].type).toBe('KNOWS');
        });
        (0, vitest_1.it)('should get incoming edges', () => {
            storage.addEdge(alice.id, bob.id, 'KNOWS');
            storage.addEdge(bob.id, alice.id, 'FOLLOWS');
            const incoming = storage.getIncomingEdges(alice.id);
            (0, vitest_1.expect)(incoming.length).toBe(1);
            (0, vitest_1.expect)(incoming[0].type).toBe('FOLLOWS');
        });
        (0, vitest_1.it)('should delete an edge', () => {
            const edge = storage.addEdge(alice.id, bob.id, 'KNOWS');
            const deleted = storage.deleteEdge(edge.id);
            (0, vitest_1.expect)(deleted).toBe(true);
            (0, vitest_1.expect)(storage.getEdge(edge.id)).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('Graph Statistics', () => {
        (0, vitest_1.it)('should track node and edge counts', () => {
            const alice = storage.addNode('Person', { name: 'Alice' });
            const bob = storage.addNode('Person', { name: 'Bob' });
            storage.addEdge(alice.id, bob.id, 'KNOWS');
            const stats = storage.getStats();
            (0, vitest_1.expect)(stats.nodeCount).toBe(2);
            (0, vitest_1.expect)(stats.edgeCount).toBe(1);
        });
    });
});
