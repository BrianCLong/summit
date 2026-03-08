"use strict";
/**
 * Native Graph Storage Engine
 * Index-free adjacency architecture with optimized node/edge storage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphStorage = void 0;
const types_js_1 = require("../types.js");
class GraphStorage {
    nodes;
    edges;
    hyperedges;
    adjacency;
    // Indexes for fast lookup
    labelIndex;
    typeIndex;
    propertyIndexes;
    // Cache for frequently accessed entities
    nodeCache;
    edgeCache;
    // Transaction log
    activeTransactions;
    wal;
    config;
    stats;
    constructor(config = {}) {
        this.config = {
            dataDir: config.dataDir || './data/graph',
            cacheSize: config.cacheSize || 1024 * 1024 * 100,
            enableCompression: config.enableCompression ?? true,
            enableEncryption: config.enableEncryption ?? false,
            partitionStrategy: config.partitionStrategy || 'hash',
            replicationFactor: config.replicationFactor || 1,
            writeAheadLog: config.writeAheadLog ?? true
        };
        this.nodes = new Map();
        this.edges = new Map();
        this.hyperedges = new Map();
        this.adjacency = {
            outgoing: new Map(),
            incoming: new Map(),
            byType: new Map()
        };
        this.labelIndex = new Map();
        this.typeIndex = new Map();
        this.propertyIndexes = new Map();
        this.nodeCache = new types_js_1.SimpleLRUCache({ max: 10000 });
        this.edgeCache = new types_js_1.SimpleLRUCache({ max: 50000 });
        this.activeTransactions = new Map();
        this.wal = [];
        this.stats = {
            nodeCount: 0,
            edgeCount: 0,
            labelCounts: new Map(),
            typeCounts: new Map(),
            avgDegree: 0,
            density: 0
        };
    }
    // ==================== Node Operations ====================
    createNode(labels, properties = {}) {
        const now = Date.now();
        const node = {
            id: (0, types_js_1.generateId)(),
            labels,
            properties,
            createdAt: now,
            updatedAt: now,
            version: 1,
            deleted: false
        };
        this.nodes.set(node.id, node);
        this.nodeCache.set(node.id, node);
        // Update label index
        for (const label of labels) {
            if (!this.labelIndex.has(label)) {
                this.labelIndex.set(label, new Set());
            }
            this.labelIndex.get(label).add(node.id);
        }
        // Initialize adjacency lists
        this.adjacency.outgoing.set(node.id, new Set());
        this.adjacency.incoming.set(node.id, new Set());
        // Update stats
        this.stats.nodeCount++;
        for (const label of labels) {
            this.stats.labelCounts.set(label, (this.stats.labelCounts.get(label) || 0) + 1);
        }
        return node;
    }
    getNode(id) {
        const cached = this.nodeCache.get(id);
        if (cached) {
            return cached;
        }
        const node = this.nodes.get(id);
        if (node && !node.deleted) {
            this.nodeCache.set(id, node);
            return node;
        }
        return undefined;
    }
    updateNode(id, properties) {
        const node = this.getNode(id);
        if (!node) {
            return undefined;
        }
        node.properties = { ...node.properties, ...properties };
        node.updatedAt = Date.now();
        node.version++;
        this.nodes.set(id, node);
        this.nodeCache.set(id, node);
        return node;
    }
    deleteNode(id) {
        const node = this.getNode(id);
        if (!node) {
            return false;
        }
        node.deleted = true;
        node.updatedAt = Date.now();
        for (const label of node.labels) {
            const labelSet = this.labelIndex.get(label);
            if (labelSet) {
                labelSet.delete(id);
            }
        }
        const outgoing = this.adjacency.outgoing.get(id) || new Set();
        const incoming = this.adjacency.incoming.get(id) || new Set();
        for (const edgeId of [...outgoing, ...incoming]) {
            this.deleteEdge(edgeId);
        }
        this.nodeCache.delete(id);
        this.stats.nodeCount--;
        for (const label of node.labels) {
            const count = this.stats.labelCounts.get(label) || 0;
            this.stats.labelCounts.set(label, Math.max(0, count - 1));
        }
        return true;
    }
    getNodesByLabel(label) {
        const nodeIds = this.labelIndex.get(label) || new Set();
        return Array.from(nodeIds)
            .map(id => this.getNode(id))
            .filter((node) => node !== undefined);
    }
    // ==================== Edge Operations ====================
    createEdge(sourceId, targetId, type, properties = {}, weight = 1.0) {
        if (!this.getNode(sourceId) || !this.getNode(targetId)) {
            return undefined;
        }
        const now = Date.now();
        const edge = {
            id: (0, types_js_1.generateId)(),
            type,
            sourceId,
            targetId,
            properties,
            weight,
            createdAt: now,
            updatedAt: now,
            version: 1,
            deleted: false
        };
        this.edges.set(edge.id, edge);
        this.edgeCache.set(edge.id, edge);
        this.adjacency.outgoing.get(sourceId).add(edge.id);
        this.adjacency.incoming.get(targetId).add(edge.id);
        if (!this.adjacency.byType.has(type)) {
            this.adjacency.byType.set(type, new Set());
        }
        this.adjacency.byType.get(type).add(edge.id);
        if (!this.typeIndex.has(type)) {
            this.typeIndex.set(type, new Set());
        }
        this.typeIndex.get(type).add(edge.id);
        this.stats.edgeCount++;
        this.stats.typeCounts.set(type, (this.stats.typeCounts.get(type) || 0) + 1);
        this.updateGraphMetrics();
        return edge;
    }
    getEdge(id) {
        const cached = this.edgeCache.get(id);
        if (cached) {
            return cached;
        }
        const edge = this.edges.get(id);
        if (edge && !edge.deleted) {
            this.edgeCache.set(id, edge);
            return edge;
        }
        return undefined;
    }
    updateEdge(id, properties, weight) {
        const edge = this.getEdge(id);
        if (!edge) {
            return undefined;
        }
        edge.properties = { ...edge.properties, ...properties };
        if (weight !== undefined) {
            edge.weight = weight;
        }
        edge.updatedAt = Date.now();
        edge.version++;
        this.edges.set(id, edge);
        this.edgeCache.set(id, edge);
        return edge;
    }
    deleteEdge(id) {
        const edge = this.getEdge(id);
        if (!edge) {
            return false;
        }
        edge.deleted = true;
        edge.updatedAt = Date.now();
        this.adjacency.outgoing.get(edge.sourceId)?.delete(id);
        this.adjacency.incoming.get(edge.targetId)?.delete(id);
        this.adjacency.byType.get(edge.type)?.delete(id);
        this.edgeCache.delete(id);
        this.stats.edgeCount--;
        const typeCount = this.stats.typeCounts.get(edge.type) || 0;
        this.stats.typeCounts.set(edge.type, Math.max(0, typeCount - 1));
        this.updateGraphMetrics();
        return true;
    }
    getEdgesByType(type) {
        const edgeIds = this.typeIndex.get(type) || new Set();
        return Array.from(edgeIds)
            .map(id => this.getEdge(id))
            .filter((edge) => edge !== undefined);
    }
    // ==================== Adjacency Operations ====================
    getOutgoingEdges(nodeId) {
        const edgeIds = this.adjacency.outgoing.get(nodeId) || new Set();
        return Array.from(edgeIds)
            .map(id => this.getEdge(id))
            .filter((edge) => edge !== undefined);
    }
    getIncomingEdges(nodeId) {
        const edgeIds = this.adjacency.incoming.get(nodeId) || new Set();
        return Array.from(edgeIds)
            .map(id => this.getEdge(id))
            .filter((edge) => edge !== undefined);
    }
    getAllEdges(nodeId) {
        const outgoing = this.getOutgoingEdges(nodeId);
        const incoming = this.getIncomingEdges(nodeId);
        return [...outgoing, ...incoming];
    }
    getNeighbors(nodeId, direction = 'both') {
        const neighbors = new Set();
        if (direction === 'out' || direction === 'both') {
            const outgoing = this.getOutgoingEdges(nodeId);
            for (const edge of outgoing) {
                neighbors.add(edge.targetId);
            }
        }
        if (direction === 'in' || direction === 'both') {
            const incoming = this.getIncomingEdges(nodeId);
            for (const edge of incoming) {
                neighbors.add(edge.sourceId);
            }
        }
        return Array.from(neighbors)
            .map(id => this.getNode(id))
            .filter((node) => node !== undefined);
    }
    getDegree(nodeId, direction = 'both') {
        let degree = 0;
        if (direction === 'out' || direction === 'both') {
            degree += (this.adjacency.outgoing.get(nodeId)?.size || 0);
        }
        if (direction === 'in' || direction === 'both') {
            degree += (this.adjacency.incoming.get(nodeId)?.size || 0);
        }
        return degree;
    }
    // ==================== Hypergraph Operations ====================
    createHyperedge(nodeIds, type, properties = {}) {
        if (!nodeIds.every(id => this.getNode(id))) {
            return undefined;
        }
        const now = Date.now();
        const hyperedge = {
            id: (0, types_js_1.generateId)(),
            type,
            nodeIds,
            properties,
            weight: 1.0,
            createdAt: now,
            updatedAt: now,
            version: 1,
            deleted: false
        };
        this.hyperedges.set(hyperedge.id, hyperedge);
        return hyperedge;
    }
    getHyperedge(id) {
        const hyperedge = this.hyperedges.get(id);
        return hyperedge && !hyperedge.deleted ? hyperedge : undefined;
    }
    getHyperedgesForNode(nodeId) {
        return Array.from(this.hyperedges.values())
            .filter(he => !he.deleted && he.nodeIds.includes(nodeId));
    }
    // ==================== Statistics and Metrics ====================
    updateGraphMetrics() {
        if (this.stats.nodeCount === 0) {
            this.stats.avgDegree = 0;
            this.stats.density = 0;
            return;
        }
        let totalDegree = 0;
        for (const nodeId of this.nodes.keys()) {
            totalDegree += this.getDegree(nodeId);
        }
        this.stats.avgDegree = totalDegree / this.stats.nodeCount;
        if (this.stats.nodeCount > 1) {
            this.stats.density = (2 * this.stats.edgeCount) /
                (this.stats.nodeCount * (this.stats.nodeCount - 1));
        }
    }
    getStats() {
        return { ...this.stats };
    }
    // ==================== Bulk Operations ====================
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.hyperedges.clear();
        this.adjacency.outgoing.clear();
        this.adjacency.incoming.clear();
        this.adjacency.byType.clear();
        this.labelIndex.clear();
        this.typeIndex.clear();
        this.propertyIndexes.clear();
        this.nodeCache.clear();
        this.edgeCache.clear();
        this.stats = {
            nodeCount: 0,
            edgeCount: 0,
            labelCounts: new Map(),
            typeCounts: new Map(),
            avgDegree: 0,
            density: 0
        };
    }
    // ==================== Export/Import ====================
    exportGraph() {
        return {
            nodes: Array.from(this.nodes.values()).filter(n => !n.deleted),
            edges: Array.from(this.edges.values()).filter(e => !e.deleted),
            hyperedges: Array.from(this.hyperedges.values()).filter(he => !he.deleted)
        };
    }
    importGraph(data) {
        this.clear();
        for (const node of data.nodes) {
            this.nodes.set(node.id, node);
            this.adjacency.outgoing.set(node.id, new Set());
            this.adjacency.incoming.set(node.id, new Set());
            for (const label of node.labels) {
                if (!this.labelIndex.has(label)) {
                    this.labelIndex.set(label, new Set());
                }
                this.labelIndex.get(label).add(node.id);
            }
        }
        for (const edge of data.edges) {
            this.edges.set(edge.id, edge);
            this.adjacency.outgoing.get(edge.sourceId)?.add(edge.id);
            this.adjacency.incoming.get(edge.targetId)?.add(edge.id);
            if (!this.adjacency.byType.has(edge.type)) {
                this.adjacency.byType.set(edge.type, new Set());
            }
            this.adjacency.byType.get(edge.type).add(edge.id);
            if (!this.typeIndex.has(edge.type)) {
                this.typeIndex.set(edge.type, new Set());
            }
            this.typeIndex.get(edge.type).add(edge.id);
        }
        if (data.hyperedges) {
            for (const hyperedge of data.hyperedges) {
                this.hyperedges.set(hyperedge.id, hyperedge);
            }
        }
        this.stats.nodeCount = this.nodes.size;
        this.stats.edgeCount = this.edges.size;
        this.updateGraphMetrics();
    }
}
exports.GraphStorage = GraphStorage;
