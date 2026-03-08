"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortestPath = shortestPath;
// Unweighted shortest path (BFS)
function shortestPath(graph, sourceId, targetId, maxDepth = 100) {
    if (sourceId === targetId) {
        return { path: [sourceId], distance: 0, edges: [] };
    }
    // Build adjacency list storing edges for retrieval
    const adj = new Map();
    graph.nodes.forEach(n => adj.set(n.id, []));
    graph.edges.forEach(e => {
        if (!adj.has(e.source))
            adj.set(e.source, []);
        adj.get(e.source)?.push({ target: e.target, edge: e });
    });
    const queue = [{ id: sourceId, dist: 0, path: [sourceId], edges: [] }];
    const visited = new Set([sourceId]);
    while (queue.length > 0) {
        const current = queue.shift();
        if (current.id === targetId) {
            return {
                path: current.path,
                distance: current.dist,
                edges: current.edges
            };
        }
        if (current.dist >= maxDepth)
            continue;
        const neighbors = adj.get(current.id) || [];
        for (const { target, edge } of neighbors) {
            if (!visited.has(target)) {
                visited.add(target);
                queue.push({
                    id: target,
                    dist: current.dist + 1,
                    path: [...current.path, target],
                    edges: [...current.edges, edge]
                });
            }
        }
    }
    return { path: null, distance: -1, edges: [] };
}
