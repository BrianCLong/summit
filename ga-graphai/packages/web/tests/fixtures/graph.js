"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFixtureGraph = buildFixtureGraph;
function buildFixtureGraph(count, rowWidth = 25, fanout = 1) {
    const nodes = Array.from({ length: count }, (_, index) => ({
        id: `node-${index}`,
        label: `Node ${index}`,
        x: (index % rowWidth) * 18,
        y: Math.floor(index / rowWidth) * 18,
    }));
    const edges = [];
    for (let index = 0; index < nodes.length; index += 1) {
        for (let step = 1; step <= fanout; step += 1) {
            const targetIndex = index + step;
            if (targetIndex >= nodes.length)
                break;
            edges.push({
                id: `edge-${index}-${step}`,
                from: nodes[index].id,
                to: nodes[targetIndex].id,
            });
        }
    }
    return { nodes, edges };
}
