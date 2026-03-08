"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryGraphAdapter = void 0;
class InMemoryGraphAdapter {
    nodes = new Map();
    edges = new Map();
    async addNode(node) {
        this.nodes.set(node.id, node);
    }
    async addEdge(edge) {
        this.edges.set(edge.id, edge);
    }
    async getNode(id) {
        return this.nodes.get(id);
    }
    async getEdgesFrom(nodeId, type) {
        return Array.from(this.edges.values()).filter((e) => e.from === nodeId && (!type || e.type === type));
    }
    async getEdgesTo(nodeId, type) {
        return Array.from(this.edges.values()).filter((e) => e.to === nodeId && (!type || e.type === type));
    }
    async queryNodes(label, propertyFilter) {
        return Array.from(this.nodes.values()).filter((n) => {
            if (n.label !== label)
                return false;
            if (propertyFilter) {
                for (const [key, value] of Object.entries(propertyFilter)) {
                    if (n.properties[key] !== value)
                        return false;
                }
            }
            return true;
        });
    }
}
exports.InMemoryGraphAdapter = InMemoryGraphAdapter;
