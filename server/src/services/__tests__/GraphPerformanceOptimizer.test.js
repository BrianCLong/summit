"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GraphPerformanceOptimizer_js_1 = require("../GraphPerformanceOptimizer.js");
(0, globals_1.describe)('GraphPerformanceOptimizer', () => {
    let optimizer;
    (0, globals_1.beforeEach)(() => {
        optimizer = new GraphPerformanceOptimizer_js_1.GraphPerformanceOptimizer({
            supernodeThreshold: 2,
            supernodeHandling: 'paginate'
        });
    });
    (0, globals_1.it)('should correctly identify and handle supernodes using optimized paths', () => {
        const nodes = [
            { id: 'node-1' },
            { id: 'node-2' },
            { id: 'node-3' }
        ];
        const edges = [
            { source: 'node-1', target: 'node-2' },
            { source: 'node-1', target: 'node-3' },
            { source: 'node-1', target: 'node-4' } // node-1 has 3 connections, threshold is 2
        ];
        const result = { nodes, edges: [...edges] };
        // @ts-ignore
        const optimized = optimizer.applySupernodeResultOptimizations(result, { supernodeDetected: true });
        (0, globals_1.expect)(optimized.metadata.supernodeOptimizations).toContain('node-1');
        // Since we only keep 1000 in paginate (default in my code), and we only have 3, none should be removed
        // Wait, my code does: const excess = connections.slice(1000);
        // So if threshold is 2 but we only have 3, nothing is removed because 3 < 1000.
        (0, globals_1.expect)(optimized.edges.length).toBe(3);
    });
    (0, globals_1.it)('should remove excess edges when above limit', () => {
        // Set a very low limit for testing if possible, but 1000 is hardcoded in the method.
        // I'll test the logic with many edges.
        const nodes = [{ id: 'node-1' }];
        const edges = Array.from({ length: 1005 }, (_, i) => ({
            source: 'node-1',
            target: `node-${i + 2}`
        }));
        const result = { nodes, edges: [...edges] };
        // @ts-ignore
        const optimized = optimizer.applySupernodeResultOptimizations(result, { supernodeDetected: true });
        (0, globals_1.expect)(optimized.metadata.supernodeOptimizations).toContain('node-1');
        (0, globals_1.expect)(optimized.edges.length).toBe(1000);
    });
});
