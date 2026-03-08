"use strict";
/**
 * P36: Data Lineage Tracker
 * Tracks data flow and transformations across the platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineageTracker = exports.LineageGraph = exports.LineageRecordSchema = exports.DataEdgeSchema = exports.DataNodeSchema = void 0;
exports.getLineageTracker = getLineageTracker;
const uuid_1 = require("uuid");
const zod_1 = require("zod");
/**
 * Data node schema
 */
exports.DataNodeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['source', 'transformation', 'sink']),
    sourceType: zod_1.z.enum(['database', 'api', 'file', 'stream', 'cache', 'external', 'user_input']).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
/**
 * Data edge schema
 */
exports.DataEdgeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceId: zod_1.z.string().uuid(),
    targetId: zod_1.z.string().uuid(),
    transformationType: zod_1.z.enum([
        'extract', 'transform', 'load', 'aggregate',
        'filter', 'join', 'enrich', 'anonymize', 'validate'
    ]).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.date(),
});
/**
 * Lineage record schema
 */
exports.LineageRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    entityId: zod_1.z.string(),
    entityType: zod_1.z.string(),
    operation: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    source: exports.DataNodeSchema.optional(),
    transformations: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        inputFields: zod_1.z.array(zod_1.z.string()).optional(),
        outputFields: zod_1.z.array(zod_1.z.string()).optional(),
    })).optional(),
    upstream: zod_1.z.array(zod_1.z.string()).optional(),
    downstream: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/**
 * Lineage graph
 */
class LineageGraph {
    nodes = new Map();
    edges = new Map();
    nodesByName = new Map();
    /**
     * Add a data node
     */
    addNode(name, type, options = {}) {
        const existingId = this.nodesByName.get(name);
        if (existingId) {
            return this.nodes.get(existingId);
        }
        const node = {
            id: (0, uuid_1.v4)(),
            name,
            type,
            sourceType: options.sourceType,
            metadata: options.metadata,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.nodes.set(node.id, node);
        this.nodesByName.set(name, node.id);
        return node;
    }
    /**
     * Add an edge between nodes
     */
    addEdge(sourceName, targetName, options = {}) {
        const sourceId = this.nodesByName.get(sourceName);
        const targetId = this.nodesByName.get(targetName);
        if (!sourceId || !targetId) {
            throw new Error(`Node not found: ${!sourceId ? sourceName : targetName}`);
        }
        const edge = {
            id: (0, uuid_1.v4)(),
            sourceId,
            targetId,
            transformationType: options.transformationType,
            metadata: options.metadata,
            createdAt: new Date(),
        };
        this.edges.set(edge.id, edge);
        return edge;
    }
    /**
     * Get upstream nodes (data sources)
     */
    getUpstream(nodeName) {
        const nodeId = this.nodesByName.get(nodeName);
        if (!nodeId)
            return [];
        const upstreamIds = new Set();
        const queue = [nodeId];
        const visited = new Set();
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            for (const edge of this.edges.values()) {
                if (edge.targetId === currentId && !visited.has(edge.sourceId)) {
                    upstreamIds.add(edge.sourceId);
                    queue.push(edge.sourceId);
                }
            }
        }
        return Array.from(upstreamIds).map(id => this.nodes.get(id));
    }
    /**
     * Get downstream nodes (data consumers)
     */
    getDownstream(nodeName) {
        const nodeId = this.nodesByName.get(nodeName);
        if (!nodeId)
            return [];
        const downstreamIds = new Set();
        const queue = [nodeId];
        const visited = new Set();
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            for (const edge of this.edges.values()) {
                if (edge.sourceId === currentId && !visited.has(edge.targetId)) {
                    downstreamIds.add(edge.targetId);
                    queue.push(edge.targetId);
                }
            }
        }
        return Array.from(downstreamIds).map(id => this.nodes.get(id));
    }
    /**
     * Get full lineage path
     */
    getLineagePath(fromName, toName) {
        const fromId = this.nodesByName.get(fromName);
        const toId = this.nodesByName.get(toName);
        if (!fromId || !toId)
            return [];
        const path = [];
        const visited = new Set();
        const queue = [{ id: fromId, path: [fromId] }];
        while (queue.length > 0) {
            const { id: currentId, path: currentPath } = queue.shift();
            if (currentId === toId) {
                return currentPath.map(id => this.nodes.get(id));
            }
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            for (const edge of this.edges.values()) {
                if (edge.sourceId === currentId && !visited.has(edge.targetId)) {
                    queue.push({
                        id: edge.targetId,
                        path: [...currentPath, edge.targetId],
                    });
                }
            }
        }
        return [];
    }
    /**
     * Export graph to JSON
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
        };
    }
    /**
     * Import graph from JSON
     */
    static fromJSON(data) {
        const graph = new LineageGraph();
        for (const node of data.nodes) {
            graph.nodes.set(node.id, node);
            graph.nodesByName.set(node.name, node.id);
        }
        for (const edge of data.edges) {
            graph.edges.set(edge.id, edge);
        }
        return graph;
    }
}
exports.LineageGraph = LineageGraph;
/**
 * Lineage tracker for recording data operations
 */
class LineageTracker {
    records = [];
    graph = new LineageGraph();
    /**
     * Record a data operation
     */
    record(params) {
        const record = {
            id: (0, uuid_1.v4)(),
            entityId: params.entityId,
            entityType: params.entityType,
            operation: params.operation,
            timestamp: new Date(),
            source: params.source ? {
                id: (0, uuid_1.v4)(),
                name: params.source.name,
                type: 'source',
                sourceType: params.source.type,
                createdAt: new Date(),
                updatedAt: new Date(),
            } : undefined,
            transformations: params.transformations,
            upstream: params.upstream,
            downstream: params.downstream,
            metadata: params.metadata,
        };
        this.records.push(record);
        // Update graph
        if (params.source) {
            this.graph.addNode(params.source.name, 'source', {
                sourceType: params.source.type,
            });
        }
        return record;
    }
    /**
     * Get lineage for an entity
     */
    getEntityLineage(entityId) {
        return this.records.filter(r => r.entityId === entityId);
    }
    /**
     * Get all records
     */
    getRecords() {
        return [...this.records];
    }
    /**
     * Get the lineage graph
     */
    getGraph() {
        return this.graph;
    }
    /**
     * Clear all records
     */
    clear() {
        this.records = [];
        this.graph = new LineageGraph();
    }
}
exports.LineageTracker = LineageTracker;
// Singleton tracker
let defaultTracker = null;
/**
 * Get default lineage tracker
 */
function getLineageTracker() {
    if (!defaultTracker) {
        defaultTracker = new LineageTracker();
    }
    return defaultTracker;
}
