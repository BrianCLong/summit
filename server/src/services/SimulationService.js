"use strict";
/**
 * Simulation Service
 *
 * Models the spread of narratives through a social graph.
 * Supports weighted edges (influence) and node susceptibility.
 *
 * @module SimulationService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationService = void 0;
class SimulationService {
    /**
     * Builds an adjacency list from nodes and edges.
     * Treats edges as bidirectional (undirected) for general social spread.
     */
    buildGraph(nodes, edges) {
        const adj = new Map();
        const nodeMap = new Map();
        nodes.forEach((n) => {
            adj.set(n.id, new Set());
            nodeMap.set(n.id, n);
        });
        edges.forEach((e) => {
            // Add source -> target
            if (!adj.has(e.source))
                adj.set(e.source, new Set());
            adj.get(e.source)?.add({ target: e.target, weight: e.weight ?? 1.0 });
            // Add target -> source (bidirectional)
            if (!adj.has(e.target))
                adj.set(e.target, new Set());
            adj.get(e.target)?.add({ target: e.source, weight: e.weight ?? 1.0 });
        });
        return { adj, nodeMap };
    }
    /**
     * Simulates the spread of a narrative or influence through the network.
     * Uses a probabilistic model based on virality, edge weights, and node susceptibility.
     */
    simulateSpread(config) {
        const { nodes, edges, seeds, steps = 5, baseVirality = 0.2 } = config;
        const { adj, nodeMap } = this.buildGraph(nodes, edges);
        const infected = new Set(seeds);
        const timeline = [];
        for (let step = 1; step <= steps; step++) {
            const newlyInfected = new Set();
            // Iterate over all currently infected nodes to see who they influence
            for (const carrierId of infected) {
                const neighbors = adj.get(carrierId);
                if (!neighbors)
                    continue;
                for (const { target: targetId, weight: influenceWeight } of neighbors) {
                    if (infected.has(targetId))
                        continue; // Already infected
                    const targetNode = nodeMap.get(targetId);
                    if (!targetNode)
                        continue;
                    // Calculate transmission probability
                    // P = Virality * Influence * Susceptibility * (1 - Resistance)
                    const susceptibility = targetNode.susceptibility ?? 0.5;
                    const resistance = targetNode.resistance ?? 0.0;
                    // Influence weight is from carrier TO target.
                    // In bidirectional graph, we assume weight is symmetric unless specified otherwise,
                    // but here we just use the edge weight.
                    const probability = baseVirality * influenceWeight * susceptibility * (1 - resistance);
                    if (Math.random() < probability) {
                        newlyInfected.add(targetId);
                    }
                }
            }
            // Commit new infections
            newlyInfected.forEach((id) => infected.add(id));
            timeline.push({
                step,
                infected: Array.from(infected),
                newlyInfected: Array.from(newlyInfected),
            });
            // Stop if fully saturated
            if (infected.size === nodes.length)
                break;
        }
        return {
            totalSteps: timeline.length,
            timeline,
            finalInfectionRate: infected.size / nodes.length,
        };
    }
}
exports.SimulationService = SimulationService;
