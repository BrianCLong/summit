"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCapabilityGraph = buildCapabilityGraph;
exports.computeBlastRadius = computeBlastRadius;
function buildCapabilityGraph(registry, inventory) {
    const nodes = [];
    const edges = [];
    const nodeIds = new Set();
    for (const capability of registry.capabilities) {
        nodes.push({
            id: capability.capability_id,
            type: 'capability',
            label: capability.name,
            metadata: {
                business_domain: capability.business_domain,
                data_classification: capability.data_classification,
            },
        });
        nodeIds.add(capability.capability_id);
        for (const dependency of capability.dependency_edges ?? []) {
            if (!nodeIds.has(dependency.target)) {
                nodes.push({
                    id: dependency.target,
                    type: dependency.target.includes('postgres') ? 'dataset' : 'service',
                    label: dependency.target,
                });
                nodeIds.add(dependency.target);
            }
            edges.push({
                source: capability.capability_id,
                target: dependency.target,
                type: dependency.type,
                metadata: { description: dependency.description },
            });
        }
    }
    for (const entry of inventory) {
        if (!nodeIds.has(entry.id)) {
            nodes.push({
                id: entry.id,
                type: 'inventory',
                label: entry.name,
                metadata: { source: entry.source, type: entry.type },
            });
            nodeIds.add(entry.id);
        }
        if (entry.capability_id) {
            edges.push({
                source: entry.id,
                target: entry.capability_id,
                type: 'mapped_to',
            });
        }
    }
    return {
        nodes: nodes.sort((a, b) => a.id.localeCompare(b.id)),
        edges: edges.sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`)),
    };
}
function computeBlastRadius(edges, startId) {
    const adjacency = new Map();
    for (const edge of edges) {
        if (!adjacency.has(edge.source)) {
            adjacency.set(edge.source, []);
        }
        adjacency.get(edge.source)?.push(edge.target);
    }
    const visited = new Set();
    const queue = [startId];
    while (queue.length) {
        const current = queue.shift();
        if (!current || visited.has(current)) {
            continue;
        }
        visited.add(current);
        const targets = adjacency.get(current) ?? [];
        for (const target of targets) {
            if (!visited.has(target)) {
                queue.push(target);
            }
        }
    }
    visited.delete(startId);
    return { downstream: Array.from(visited).sort() };
}
