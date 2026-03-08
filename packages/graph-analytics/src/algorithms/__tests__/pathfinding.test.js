"use strict";
/**
 * Unit tests for pathfinding algorithms
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pathfinding_1 = require("../pathfinding");
describe('Pathfinding Algorithms', () => {
    describe('findShortestPath', () => {
        it('should find shortest path in simple graph', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                    { id: 'D' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'C', weight: 1 },
                    { source: 'A', target: 'D', weight: 5 },
                    { source: 'D', target: 'C', weight: 1 },
                ],
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C');
            expect(result.found).toBe(true);
            expect(result.path).toBeDefined();
            expect(result.path.path).toEqual(['A', 'B', 'C']);
            expect(result.path.distance).toBe(2);
        });
        it('should return null when no path exists', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                ],
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C');
            expect(result.found).toBe(false);
            expect(result.path).toBeNull();
        });
        it('should respect policy filters for node types', () => {
            const graph = {
                nodes: [
                    { id: 'A', type: 'Person' },
                    { id: 'B', type: 'Organization' },
                    { id: 'C', type: 'Person' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'C', weight: 1 },
                ],
            };
            const options = {
                policyFilter: {
                    allowedNodeTypes: ['Person'],
                },
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C', options);
            // Path should not exist because B (Organization) is filtered out
            expect(result.found).toBe(false);
        });
        it('should respect policy filters for edge types', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                ],
                edges: [
                    { source: 'A', target: 'B', type: 'KNOWS', weight: 1 },
                    { source: 'B', target: 'C', type: 'WORKS_WITH', weight: 1 },
                ],
            };
            const options = {
                policyFilter: {
                    allowedEdgeTypes: ['KNOWS'],
                },
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C', options);
            // Path should not exist because second edge is filtered
            expect(result.found).toBe(false);
        });
        it('should respect time-based scope filtering', () => {
            const now = Date.now();
            const graph = {
                nodes: [
                    { id: 'A', timestamp: now - 10000 },
                    { id: 'B', timestamp: now },
                    { id: 'C', timestamp: now + 10000 },
                ],
                edges: [
                    { source: 'A', target: 'B', timestamp: now },
                    { source: 'B', target: 'C', timestamp: now + 5000 },
                ],
            };
            const options = {
                scopeFilter: {
                    startTime: now - 5000,
                    endTime: now + 5000,
                },
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C', options);
            // Node C should be filtered out due to timestamp
            expect(result.found).toBe(false);
        });
        it('should respect max path length constraint', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                    { id: 'D' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'C', weight: 1 },
                    { source: 'C', target: 'D', weight: 1 },
                ],
            };
            const options = {
                maxPathLength: 2,
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'D', options);
            // Path A->B->C->D has 4 nodes, exceeds maxPathLength of 2
            expect(result.found).toBe(false);
        });
        it('should respect node exploration budget', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                    { id: 'D' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'A', target: 'C', weight: 1 },
                    { source: 'B', target: 'D', weight: 1 },
                    { source: 'C', target: 'D', weight: 1 },
                ],
            };
            const options = {
                maxNodesToExplore: 2,
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'D', options);
            expect(result.nodesExplored).toBeLessThanOrEqual(2);
            expect(result.metadata.budgetExceeded).toBe(true);
        });
        it('should generate XAI explanations when requested', () => {
            const graph = {
                nodes: [
                    { id: 'A', type: 'Person' },
                    { id: 'B', type: 'Organization' },
                    { id: 'C', type: 'Location' },
                ],
                edges: [
                    { source: 'A', target: 'B', type: 'WORKS_FOR', weight: 1 },
                    { source: 'B', target: 'C', type: 'LOCATED_AT', weight: 1 },
                ],
            };
            const options = {
                generateExplanations: true,
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C', options);
            expect(result.found).toBe(true);
            expect(result.path.explanations).toBeDefined();
            expect(result.path.explanations.length).toBeGreaterThan(0);
            // Check explanation structure
            const explanation = result.path.explanations[0];
            expect(explanation).toHaveProperty('elementId');
            expect(explanation).toHaveProperty('elementType');
            expect(explanation).toHaveProperty('importanceScore');
            expect(explanation).toHaveProperty('reasoning');
            expect(explanation).toHaveProperty('evidence');
            expect(explanation).toHaveProperty('uncertainty');
        });
        it('should handle weighted graphs correctly', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 10 },
                    { source: 'B', target: 'C', weight: 1 },
                    { source: 'A', target: 'C', weight: 5 },
                ],
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C');
            expect(result.found).toBe(true);
            expect(result.path.path).toEqual(['A', 'C']);
            expect(result.path.distance).toBe(5);
        });
        it('should handle directed graphs', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'C', target: 'B', weight: 1 },
                ],
            };
            const options = {
                directed: true,
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C', options);
            // No path exists in directed graph from A to C
            expect(result.found).toBe(false);
        });
        it('should handle single node graph', () => {
            const graph = {
                nodes: [{ id: 'A' }],
                edges: [],
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'A');
            expect(result.found).toBe(true);
            expect(result.path.path).toEqual(['A']);
            expect(result.path.distance).toBe(0);
        });
        it('should handle empty graph', () => {
            const graph = {
                nodes: [],
                edges: [],
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'B');
            expect(result.found).toBe(false);
            expect(result.path).toBeNull();
        });
    });
    describe('findKShortestPaths', () => {
        it('should find k shortest paths', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                    { id: 'D' },
                    { id: 'E' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'E', weight: 1 },
                    { source: 'A', target: 'C', weight: 1 },
                    { source: 'C', target: 'D', weight: 1 },
                    { source: 'D', target: 'E', weight: 1 },
                ],
            };
            const result = (0, pathfinding_1.findKShortestPaths)(graph, 'A', 'E', 2);
            expect(result.paths.length).toBeGreaterThan(0);
            expect(result.paths.length).toBeLessThanOrEqual(2);
            expect(result.metadata.foundPaths).toBe(result.paths.length);
            // Paths should be sorted by distance
            for (let i = 1; i < result.paths.length; i++) {
                expect(result.paths[i].distance).toBeGreaterThanOrEqual(result.paths[i - 1].distance);
            }
        });
        it('should return empty array when no path exists', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                ],
            };
            const result = (0, pathfinding_1.findKShortestPaths)(graph, 'A', 'C', 3);
            expect(result.paths).toEqual([]);
            expect(result.metadata.foundPaths).toBe(0);
        });
        it('should respect k parameter', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                    { id: 'D' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'D', weight: 1 },
                    { source: 'A', target: 'C', weight: 2 },
                    { source: 'C', target: 'D', weight: 1 },
                ],
            };
            const result = (0, pathfinding_1.findKShortestPaths)(graph, 'A', 'D', 1);
            expect(result.paths.length).toBeLessThanOrEqual(1);
        });
        it('should generate explanations for all paths when requested', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'C', weight: 1 },
                ],
            };
            const options = {
                generateExplanations: true,
            };
            const result = (0, pathfinding_1.findKShortestPaths)(graph, 'A', 'C', 2, options);
            expect(result.paths.length).toBeGreaterThan(0);
            for (const path of result.paths) {
                expect(path.explanations).toBeDefined();
                expect(path.explanations.length).toBeGreaterThan(0);
            }
        });
        it('should respect policy filters', () => {
            const graph = {
                nodes: [
                    { id: 'A', type: 'Person' },
                    { id: 'B', type: 'Person' },
                    { id: 'C', type: 'Organization' },
                    { id: 'D', type: 'Person' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'D', weight: 1 },
                    { source: 'A', target: 'C', weight: 1 },
                    { source: 'C', target: 'D', weight: 1 },
                ],
            };
            const options = {
                policyFilter: {
                    allowedNodeTypes: ['Person'],
                },
            };
            const result = (0, pathfinding_1.findKShortestPaths)(graph, 'A', 'D', 2, options);
            // Only one path should exist (through B), C is filtered out
            expect(result.paths.length).toBe(1);
            expect(result.paths[0].path).toEqual(['A', 'B', 'D']);
        });
        it('should respect node exploration budget', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                    { id: 'D' },
                    { id: 'E' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'E', weight: 1 },
                    { source: 'A', target: 'C', weight: 1 },
                    { source: 'C', target: 'D', weight: 1 },
                    { source: 'D', target: 'E', weight: 1 },
                ],
            };
            const options = {
                maxNodesToExplore: 5,
            };
            const result = (0, pathfinding_1.findKShortestPaths)(graph, 'A', 'E', 3, options);
            expect(result.nodesExplored).toBeLessThanOrEqual(5);
        });
    });
    describe('Edge cases', () => {
        it('should handle self-loops', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                ],
                edges: [
                    { source: 'A', target: 'A', weight: 1 },
                    { source: 'A', target: 'B', weight: 2 },
                ],
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'B');
            expect(result.found).toBe(true);
            expect(result.path.distance).toBe(2);
        });
        it('should handle disconnected components', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                    { id: 'D' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'C', target: 'D', weight: 1 },
                ],
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'D');
            expect(result.found).toBe(false);
        });
        it('should handle policy labels correctly', () => {
            const graph = {
                nodes: [
                    { id: 'A', policyLabels: ['public'] },
                    { id: 'B', policyLabels: ['secret'] },
                    { id: 'C', policyLabels: ['public'] },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1, policyLabels: ['secret'] },
                    { source: 'B', target: 'C', weight: 1, policyLabels: ['secret'] },
                ],
            };
            const options = {
                policyFilter: {
                    requiredPolicyLabels: ['public'],
                },
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C', options);
            // B and edges have 'secret' label, not 'public', so they're filtered
            expect(result.found).toBe(false);
        });
        it('should handle forbidden policy labels', () => {
            const graph = {
                nodes: [
                    { id: 'A', policyLabels: ['public'] },
                    { id: 'B', policyLabels: ['classified'] },
                    { id: 'C', policyLabels: ['public'] },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'C', weight: 1 },
                ],
            };
            const options = {
                policyFilter: {
                    forbiddenPolicyLabels: ['classified'],
                },
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C', options);
            // B has 'classified' label which is forbidden
            expect(result.found).toBe(false);
        });
    });
    describe('Performance characteristics', () => {
        it('should complete within reasonable time for medium graph', () => {
            // Create graph with 100 nodes
            const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `N${i}` }));
            const edges = [];
            // Create random edges
            for (let i = 0; i < 200; i++) {
                const source = Math.floor(Math.random() * 100);
                const target = Math.floor(Math.random() * 100);
                if (source !== target) {
                    edges.push({
                        source: `N${source}`,
                        target: `N${target}`,
                        weight: Math.random() * 10,
                    });
                }
            }
            const graph = { nodes, edges };
            const start = performance.now();
            const result = (0, pathfinding_1.findShortestPath)(graph, 'N0', 'N99');
            const duration = performance.now() - start;
            // Should complete in less than 100ms for 100 nodes
            expect(duration).toBeLessThan(100);
            expect(result.executionTime).toBeLessThan(100);
        });
        it('should track execution time accurately', () => {
            const graph = {
                nodes: [
                    { id: 'A' },
                    { id: 'B' },
                    { id: 'C' },
                ],
                edges: [
                    { source: 'A', target: 'B', weight: 1 },
                    { source: 'B', target: 'C', weight: 1 },
                ],
            };
            const result = (0, pathfinding_1.findShortestPath)(graph, 'A', 'C');
            expect(result.executionTime).toBeGreaterThan(0);
            expect(result.executionTime).toBeLessThan(1000);
        });
    });
});
