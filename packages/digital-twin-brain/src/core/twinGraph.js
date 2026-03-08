"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwinGraph = void 0;
class TwinGraph {
    nodes = new Map();
    edges = new Map();
    upsertNode(node) {
        this.nodes.set(node.id, node);
    }
    upsertEdge(edge) {
        if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
            throw new Error(`Edge references unknown nodes: ${edge.id}`);
        }
        this.edges.set(edge.id, edge);
    }
    getNode(id) {
        return this.nodes.get(id);
    }
    neighbors(id, relationshipType) {
        const relevantEdges = Array.from(this.edges.values()).filter((edge) => edge.source === id && (!relationshipType || edge.type === relationshipType));
        return relevantEdges.map((edge) => this.nodes.get(edge.target)).filter(Boolean);
    }
    findByType(type) {
        return Array.from(this.nodes.values()).filter((node) => node.type === type);
    }
}
exports.TwinGraph = TwinGraph;
