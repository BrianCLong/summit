"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFixtureGraph = buildFixtureGraph;
function buildFixtureGraph(count) {
    const nodes = Array.from({ length: count }, (_, index) => ({
        id: `node-${index}`,
        label: `Node ${index}`,
        x: (index % 40) * 16,
        y: Math.floor(index / 40) * 16,
    }));
    const edges = nodes.slice(1).map((node, index) => ({
        id: `edge-${index}`,
        from: nodes[index].id,
        to: node.id,
    }));
    return { nodes, edges };
}
