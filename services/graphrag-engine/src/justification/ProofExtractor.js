"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofExtractor = void 0;
class ProofExtractor {
    static extract(records) {
        const nodes = new Map();
        const edges = [];
        for (const record of records) {
            record.forEach((value) => {
                if (this.isNode(value)) {
                    this.addNode(value, nodes);
                }
                else if (this.isRelationship(value)) {
                    this.addEdge(value, edges, nodes);
                }
            });
        }
        return {
            nodes: Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id)),
            edges: edges.sort((a, b) => {
                const sourceComp = a.sourceId.localeCompare(b.sourceId);
                if (sourceComp !== 0)
                    return sourceComp;
                return a.targetId.localeCompare(b.targetId);
            })
        };
    }
    static isNode(obj) {
        return obj && typeof obj === 'object' && 'labels' in obj && 'properties' in obj;
    }
    static isRelationship(obj) {
        return obj && typeof obj === 'object' && 'type' in obj && 'start' in obj && 'end' in obj;
    }
    static addNode(node, map) {
        const id = node.properties.id || node.identity?.toString() || 'unknown';
        if (!map.has(id)) {
            map.set(id, {
                id,
                labels: node.labels,
                properties: node.properties,
                provenance: node.properties.evidence_id
            });
        }
    }
    static addEdge(rel, edges, nodes) {
        edges.push({
            type: rel.type,
            sourceId: rel.start.toString(),
            targetId: rel.end.toString(),
            properties: rel.properties
        });
    }
}
exports.ProofExtractor = ProofExtractor;
