"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const graph_database_1 = require("@intelgraph/graph-database");
const LinkPredictor_js_1 = require("../LinkPredictor.js");
(0, vitest_1.describe)('LinkPredictor', () => {
    let storage;
    let predictor;
    (0, vitest_1.beforeEach)(() => {
        storage = new graph_database_1.GraphStorage();
        // Create a small social network
        const alice = storage.addNode('Person', { name: 'Alice' });
        const bob = storage.addNode('Person', { name: 'Bob' });
        const charlie = storage.addNode('Person', { name: 'Charlie' });
        const dave = storage.addNode('Person', { name: 'Dave' });
        // Alice knows Bob and Charlie
        storage.addEdge(alice.id, bob.id, 'KNOWS');
        storage.addEdge(alice.id, charlie.id, 'KNOWS');
        // Bob knows Charlie
        storage.addEdge(bob.id, charlie.id, 'KNOWS');
        // Dave only knows Charlie
        storage.addEdge(dave.id, charlie.id, 'KNOWS');
        predictor = new LinkPredictor_js_1.LinkPredictor(storage);
    });
    (0, vitest_1.describe)('Common Neighbors', () => {
        (0, vitest_1.it)('should calculate common neighbors score', () => {
            const nodes = Array.from(storage.getAllNodes());
            const alice = nodes.find(n => n.properties.name === 'Alice');
            const bob = nodes.find(n => n.properties.name === 'Bob');
            const dave = nodes.find(n => n.properties.name === 'Dave');
            // Alice-Bob have Charlie as common neighbor (but they're already connected)
            // Alice-Dave have Charlie as common neighbor
            const score = predictor.commonNeighbors(alice.id, dave.id);
            (0, vitest_1.expect)(score).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Jaccard Coefficient', () => {
        (0, vitest_1.it)('should calculate Jaccard similarity', () => {
            const nodes = Array.from(storage.getAllNodes());
            const alice = nodes.find(n => n.properties.name === 'Alice');
            const dave = nodes.find(n => n.properties.name === 'Dave');
            const score = predictor.jaccardCoefficient(alice.id, dave.id);
            (0, vitest_1.expect)(score).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(score).toBeLessThanOrEqual(1);
        });
    });
    (0, vitest_1.describe)('Adamic-Adar Index', () => {
        (0, vitest_1.it)('should calculate Adamic-Adar score', () => {
            const nodes = Array.from(storage.getAllNodes());
            const alice = nodes.find(n => n.properties.name === 'Alice');
            const dave = nodes.find(n => n.properties.name === 'Dave');
            const score = predictor.adamicAdar(alice.id, dave.id);
            (0, vitest_1.expect)(score).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('Link Predictions', () => {
        (0, vitest_1.it)('should predict potential links', () => {
            const predictions = predictor.predictLinks(5);
            (0, vitest_1.expect)(Array.isArray(predictions)).toBe(true);
            predictions.forEach(pred => {
                (0, vitest_1.expect)(pred).toHaveProperty('source');
                (0, vitest_1.expect)(pred).toHaveProperty('target');
                (0, vitest_1.expect)(pred).toHaveProperty('score');
            });
        });
    });
});
