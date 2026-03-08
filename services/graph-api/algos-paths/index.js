"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortestPath = shortestPath;
exports.kShortestPaths = kShortestPaths;
exports.constrainedPaths = constrainedPaths;
function filterEdges(edges, constraints) {
    if (!constraints)
        return edges;
    return edges.filter((e) => {
        if (constraints.policies &&
            e.policy &&
            !constraints.policies.includes(e.policy)) {
            return false;
        }
        if (constraints.territories &&
            e.territory &&
            !constraints.territories.includes(e.territory)) {
            return false;
        }
        if (constraints.timeWindow && typeof e.time === 'number') {
            const [start, end] = constraints.timeWindow;
            if (e.time < start || e.time > end)
                return false;
        }
        return true;
    });
}
function buildGraph(edges) {
    const graph = new Map();
    for (const edge of edges) {
        if (!graph.has(edge.from))
            graph.set(edge.from, []);
        graph.get(edge.from).push(edge);
    }
    return graph;
}
function shortestPath(edges, start, goal, constraints) {
    const filtered = filterEdges(edges, constraints);
    const graph = buildGraph(filtered);
    const visited = new Set();
    const queue = [{ node: start, cost: 0, path: [start] }];
    while (queue.length) {
        queue.sort((a, b) => a.cost - b.cost);
        const current = queue.shift();
        if (current.node === goal)
            return current.path;
        if (visited.has(current.node))
            continue;
        visited.add(current.node);
        const neighbors = graph.get(current.node) || [];
        for (const edge of neighbors) {
            if (!visited.has(edge.to)) {
                queue.push({
                    node: edge.to,
                    cost: current.cost + (edge.weight ?? 1),
                    path: [...current.path, edge.to],
                });
            }
        }
    }
    return null;
}
function kShortestPaths(edges, start, goal, k, constraints) {
    const paths = [];
    const filtered = filterEdges(edges, constraints);
    // Simple Yen's algorithm style approach
    const basePath = shortestPath(filtered, start, goal);
    if (!basePath)
        return paths;
    paths.push(basePath);
    const potential = [];
    for (let i = 1; i < k; i++) {
        const lastPath = paths[i - 1];
        for (let j = 0; j < lastPath.length - 1; j++) {
            const spurNode = lastPath[j];
            const rootPath = lastPath.slice(0, j + 1);
            const removed = [];
            for (const p of paths) {
                if (p.length > j && rootPath.every((v, idx) => v === p[idx])) {
                    const edgeToRemove = filtered.find((e) => e.from === p[j] && e.to === p[j + 1]);
                    if (edgeToRemove) {
                        filtered.splice(filtered.indexOf(edgeToRemove), 1);
                        removed.push(edgeToRemove);
                    }
                }
            }
            const spurPath = shortestPath(filtered, spurNode, goal);
            if (spurPath) {
                const totalPath = [...rootPath.slice(0, -1), ...spurPath];
                const cost = totalPath.reduce((sum, _, idx, arr) => {
                    if (idx === arr.length - 1)
                        return sum;
                    const edge = edges.find((e) => e.from === arr[idx] && e.to === arr[idx + 1]);
                    return sum + (edge?.weight ?? 1);
                }, 0);
                potential.push({ cost, path: totalPath });
            }
            filtered.push(...removed);
        }
        if (!potential.length)
            break;
        potential.sort((a, b) => a.cost - b.cost);
        const best = potential.shift();
        paths.push(best.path);
    }
    return paths;
}
function constrainedPaths(edges, start, goal, constraints) {
    return shortestPath(edges, start, goal, constraints);
}
