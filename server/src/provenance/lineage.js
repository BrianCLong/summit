"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineageGraph = exports.DataLineageGraph = void 0;
const ledger_js_1 = require("./ledger.js");
class DataLineageGraph {
    async buildGraph(tenantId) {
        const entries = await ledger_js_1.provenanceLedger.getEntries(tenantId, { limit: 10000 });
        const nodes = new Map();
        const edges = [];
        for (const entry of entries) {
            // Process Nodes
            const nodeId = `${entry.resourceType}:${entry.resourceId}`;
            if (!nodes.has(nodeId)) {
                nodes.set(nodeId, {
                    id: nodeId,
                    type: entry.resourceType,
                    label: entry.resourceId,
                    createdAt: entry.timestamp,
                    updatedAt: entry.timestamp,
                    metadata: {}
                });
            }
            else {
                const node = nodes.get(nodeId);
                node.updatedAt = entry.timestamp;
            }
            // Process Edges from payload metadata
            // Expecting metadata to optionally contain 'derivedFrom', 'dependsOn', or 'parent'
            // which are IDs or arrays of IDs
            const relations = ['derivedFrom', 'dependsOn', 'parent', 'inputs'];
            for (const rel of relations) {
                if (entry.metadata && entry.metadata[rel]) {
                    const targets = Array.isArray(entry.metadata[rel])
                        ? entry.metadata[rel]
                        : [entry.metadata[rel]];
                    for (const target of targets) {
                        // target might be just ID or "Type:ID"
                        let targetId = target;
                        if (!target.includes(':')) {
                            // infer type if possible, or just use as is
                            // For simplicity, assume target string is full ID or we default to same type
                            targetId = `${entry.resourceType}:${target}`;
                        }
                        edges.push({
                            sourceId: targetId, // derivedFrom means Target -> Source dependency usually? Or Source -> Target?
                            // If A is derived from B, then B -> A (flow of data)
                            targetId: nodeId,
                            relation: rel,
                            timestamp: entry.timestamp,
                            metadata: { entryId: entry.id }
                        });
                    }
                }
            }
        }
        return {
            nodes: Array.from(nodes.values()),
            edges,
            generatedAt: new Date(),
            tenantId
        };
    }
    serialize(graph) {
        return JSON.stringify(graph, null, 2);
    }
    deserialize(json) {
        const graph = JSON.parse(json);
        // Restore dates
        graph.generatedAt = new Date(graph.generatedAt);
        graph.nodes.forEach((n) => {
            n.createdAt = new Date(n.createdAt);
            n.updatedAt = new Date(n.updatedAt);
        });
        graph.edges.forEach((e) => {
            e.timestamp = new Date(e.timestamp);
        });
        return graph;
    }
}
exports.DataLineageGraph = DataLineageGraph;
exports.lineageGraph = new DataLineageGraph();
