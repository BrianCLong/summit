"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphBuilder = void 0;
class GraphBuilder {
    nodes = new Map();
    edgeMap = new Map();
    addNode(entity) {
        const existing = this.nodes.get(entity.id);
        if (existing) {
            this.nodes.set(entity.id, { ...existing, ...entity });
            return;
        }
        this.nodes.set(entity.id, { ...entity });
    }
    addEdge(from, to, weight, type = 'interaction') {
        if (!this.nodes.has(from.id)) {
            this.addNode(from);
        }
        if (!this.nodes.has(to.id)) {
            this.addNode(to);
        }
        const key = `${from.id}->${to.id}`;
        const existing = this.edgeMap.get(key);
        if (existing) {
            existing.weight += weight;
            if (!existing.types.includes(type)) {
                existing.types.push(type);
            }
            this.edgeMap.set(key, existing);
            return;
        }
        this.edgeMap.set(key, {
            from: from.id,
            to: to.id,
            weight,
            types: [type],
        });
    }
    build() {
        const adjacency = {};
        for (const edge of this.edgeMap.values()) {
            if (!adjacency[edge.from]) {
                adjacency[edge.from] = {};
            }
            adjacency[edge.from][edge.to] = edge.weight;
        }
        return {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edgeMap.values()).sort((a, b) => {
                if (a.weight === b.weight) {
                    return a.to.localeCompare(b.to);
                }
                return b.weight - a.weight;
            }),
            adjacency,
        };
    }
}
exports.GraphBuilder = GraphBuilder;
