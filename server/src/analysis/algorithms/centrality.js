"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.degreeCentrality = degreeCentrality;
function degreeCentrality(graph, direction = 'both', topK) {
    const scores = {};
    // Initialize scores
    graph.nodes.forEach(n => {
        scores[n.id] = 0;
    });
    graph.edges.forEach(edge => {
        if (direction === 'out' || direction === 'both') {
            if (scores[edge.source] !== undefined)
                scores[edge.source]++;
        }
        if (direction === 'in' || direction === 'both') {
            if (scores[edge.target] !== undefined)
                scores[edge.target]++;
        }
    });
    const sortedNodes = Object.entries(scores)
        .map(([id, score]) => ({ id, score }))
        .sort((a, b) => b.score - a.score);
    return {
        scores,
        sortedNodes: topK ? sortedNodes.slice(0, topK) : sortedNodes
    };
}
