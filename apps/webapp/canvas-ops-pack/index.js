"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pivot = pivot;
exports.expand = expand;
exports.filterByTime = filterByTime;
exports.filterBySpace = filterBySpace;
exports.createPinboard = createPinboard;
exports.addAnnotation = addAnnotation;
function pivot(graph, nodeId) {
    return graph.edges
        .filter((e) => e.source === nodeId || e.target === nodeId)
        .map((e) => (e.source === nodeId ? e.target : e.source))
        .map((id) => graph.nodes.find((n) => n.id === id))
        .filter((n) => Boolean(n));
}
function expand(graph, nodeIds) {
    const seen = new Set(nodeIds);
    const results = [];
    nodeIds.forEach((id) => {
        pivot(graph, id).forEach((n) => {
            if (!seen.has(n.id)) {
                seen.add(n.id);
                results.push(n);
            }
        });
    });
    return results;
}
function filterByTime(nodes, start, end) {
    return nodes.filter((n) => typeof n.time === 'number' && n.time >= start && n.time <= end);
}
function filterBySpace(nodes, region) {
    return nodes.filter((n) => n.region === region);
}
function createPinboard(name, nodes = []) {
    return { name, nodes, annotations: [] };
}
function addAnnotation(pinboard, note) {
    pinboard.annotations.push(note);
}
