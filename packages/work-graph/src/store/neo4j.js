"use strict";
/**
 * Summit Work Graph - Neo4j Graph Store
 *
 * Persistent graph storage using Neo4j with full ACID transactions,
 * efficient traversal queries, and real-time change detection.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryGraphStore = exports.Neo4jGraphStore = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
// ============================================
// Neo4j Graph Store
// ============================================
class Neo4jGraphStore {
    driver;
    database;
    changeListeners = [];
    constructor(config) {
        this.driver = neo4j_driver_1.default.driver(config.uri, neo4j_driver_1.default.auth.basic(config.username, config.password), {
            maxConnectionPoolSize: config.maxConnectionPoolSize ?? 50,
            connectionAcquisitionTimeout: 30000,
        });
        this.database = config.database ?? 'neo4j';
    }
    async connect() {
        await this.driver.verifyConnectivity();
        await this.ensureIndexes();
    }
    async disconnect() {
        await this.driver.close();
    }
    // ============================================
    // Node Operations
    // ============================================
    async createNode(node) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeWrite(async (tx) => {
                const query = `
          CREATE (n:${this.getNodeLabel(node.type)} $props)
          SET n.createdAt = datetime($createdAt)
          SET n.updatedAt = datetime($updatedAt)
          RETURN n
        `;
                const params = {
                    props: this.serializeNode(node),
                    createdAt: node.createdAt.toISOString(),
                    updatedAt: node.updatedAt.toISOString(),
                };
                return tx.run(query, params);
            });
            const created = this.deserializeNode(result.records[0].get('n').properties);
            this.emitChange({
                type: 'node_created',
                entityType: 'node',
                entityId: created.id,
                data: created,
                timestamp: new Date(),
                actor: node.createdBy,
            });
            return created;
        }
        finally {
            await session.close();
        }
    }
    async getNode(id) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeRead(async (tx) => {
                const query = `MATCH (n {id: $id}) RETURN n`;
                return tx.run(query, { id });
            });
            if (result.records.length === 0)
                return null;
            return this.deserializeNode(result.records[0].get('n').properties);
        }
        finally {
            await session.close();
        }
    }
    async getNodes(filter, options) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeRead(async (tx) => {
                let query = 'MATCH (n)';
                const params = {};
                if (filter) {
                    const conditions = Object.entries(filter)
                        .filter(([_, v]) => v !== undefined)
                        .map(([k, v], i) => {
                        params[`p${i}`] = v;
                        return `n.${k} = $p${i}`;
                    });
                    if (conditions.length > 0) {
                        query += ` WHERE ${conditions.join(' AND ')}`;
                    }
                }
                query += ' RETURN n';
                if (options?.orderBy) {
                    query += ` ORDER BY n.${options.orderBy} ${options.orderDirection ?? 'ASC'}`;
                }
                if (options?.skip) {
                    query += ` SKIP ${options.skip}`;
                }
                if (options?.limit) {
                    query += ` LIMIT ${options.limit}`;
                }
                return tx.run(query, params);
            });
            return result.records.map((r) => this.deserializeNode(r.get('n').properties));
        }
        finally {
            await session.close();
        }
    }
    async updateNode(id, updates) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeWrite(async (tx) => {
                const setStatements = Object.entries(updates)
                    .filter(([k]) => k !== 'id' && k !== 'type' && k !== 'createdAt')
                    .map(([k], i) => `n.${k} = $u${i}`)
                    .join(', ');
                const params = { id };
                Object.entries(updates)
                    .filter(([k]) => k !== 'id' && k !== 'type' && k !== 'createdAt')
                    .forEach(([_, v], i) => {
                    params[`u${i}`] = v instanceof Date ? v.toISOString() : v;
                });
                const query = `
          MATCH (n {id: $id})
          SET ${setStatements}, n.updatedAt = datetime()
          RETURN n
        `;
                return tx.run(query, params);
            });
            if (result.records.length === 0)
                return null;
            const updated = this.deserializeNode(result.records[0].get('n').properties);
            this.emitChange({
                type: 'node_updated',
                entityType: 'node',
                entityId: id,
                data: updates,
                timestamp: new Date(),
                actor: 'system',
            });
            return updated;
        }
        finally {
            await session.close();
        }
    }
    async deleteNode(id) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeWrite(async (tx) => {
                const query = `MATCH (n {id: $id}) DETACH DELETE n RETURN count(n) as deleted`;
                return tx.run(query, { id });
            });
            const deleted = result.records[0].get('deleted').toNumber() > 0;
            if (deleted) {
                this.emitChange({
                    type: 'node_deleted',
                    entityType: 'node',
                    entityId: id,
                    timestamp: new Date(),
                    actor: 'system',
                });
            }
            return deleted;
        }
        finally {
            await session.close();
        }
    }
    // ============================================
    // Edge Operations
    // ============================================
    async createEdge(edge) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeWrite(async (tx) => {
                const query = `
          MATCH (source {id: $sourceId})
          MATCH (target {id: $targetId})
          CREATE (source)-[r:${this.getEdgeLabel(edge.type)} $props]->(target)
          SET r.createdAt = datetime($createdAt)
          RETURN r
        `;
                const params = {
                    sourceId: edge.sourceId,
                    targetId: edge.targetId,
                    props: this.serializeEdge(edge),
                    createdAt: edge.createdAt.toISOString(),
                };
                return tx.run(query, params);
            });
            const created = this.deserializeEdge(result.records[0].get('r').properties);
            this.emitChange({
                type: 'edge_created',
                entityType: 'edge',
                entityId: created.id,
                data: created,
                timestamp: new Date(),
                actor: edge.createdBy,
            });
            return created;
        }
        finally {
            await session.close();
        }
    }
    async getEdges(filter) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeRead(async (tx) => {
                let query = 'MATCH (s)-[r]->(t) WHERE 1=1';
                const params = {};
                if (filter?.sourceId) {
                    query += ' AND s.id = $sourceId';
                    params.sourceId = filter.sourceId;
                }
                if (filter?.targetId) {
                    query += ' AND t.id = $targetId';
                    params.targetId = filter.targetId;
                }
                if (filter?.type) {
                    query += ` AND type(r) = $edgeType`;
                    params.edgeType = this.getEdgeLabel(filter.type);
                }
                query += ' RETURN r, s.id as sourceId, t.id as targetId';
                return tx.run(query, params);
            });
            return result.records.map((r) => ({
                ...this.deserializeEdge(r.get('r').properties),
                sourceId: r.get('sourceId'),
                targetId: r.get('targetId'),
            }));
        }
        finally {
            await session.close();
        }
    }
    async getIncomingEdges(nodeId) {
        return this.getEdges({ targetId: nodeId });
    }
    async getOutgoingEdges(nodeId) {
        return this.getEdges({ sourceId: nodeId });
    }
    async deleteEdge(id) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeWrite(async (tx) => {
                const query = `MATCH ()-[r {id: $id}]->() DELETE r RETURN count(r) as deleted`;
                return tx.run(query, { id });
            });
            const deleted = result.records[0].get('deleted').toNumber() > 0;
            if (deleted) {
                this.emitChange({
                    type: 'edge_deleted',
                    entityType: 'edge',
                    entityId: id,
                    timestamp: new Date(),
                    actor: 'system',
                });
            }
            return deleted;
        }
        finally {
            await session.close();
        }
    }
    // ============================================
    // Graph Queries
    // ============================================
    async findPath(fromId, toId, edgeTypes) {
        const session = this.driver.session({ database: this.database });
        try {
            const edgeFilter = edgeTypes
                ? `:${edgeTypes.map((t) => this.getEdgeLabel(t)).join('|')}`
                : '';
            const result = await session.executeRead(async (tx) => {
                const query = `
          MATCH path = shortestPath((start {id: $fromId})-[${edgeFilter}*]-(end {id: $toId}))
          RETURN [n IN nodes(path) | n.id] as nodeIds,
                 [r IN relationships(path) | r.id] as edgeIds
        `;
                return tx.run(query, { fromId, toId });
            });
            if (result.records.length === 0)
                return null;
            return {
                nodes: result.records[0].get('nodeIds'),
                edges: result.records[0].get('edgeIds'),
            };
        }
        finally {
            await session.close();
        }
    }
    async findDependencyChain(nodeId, depth = 10) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeRead(async (tx) => {
                const query = `
          MATCH (start {id: $nodeId})-[:DEPENDS_ON*1..${depth}]->(dep)
          RETURN DISTINCT dep.id as depId
        `;
                return tx.run(query, { nodeId });
            });
            return result.records.map((r) => r.get('depId'));
        }
        finally {
            await session.close();
        }
    }
    async findBlockedNodes(nodeId) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeRead(async (tx) => {
                const query = `
          MATCH (blocker {id: $nodeId})<-[:DEPENDS_ON]-(blocked)
          RETURN blocked.id as blockedId
        `;
                return tx.run(query, { nodeId });
            });
            return result.records.map((r) => r.get('blockedId'));
        }
        finally {
            await session.close();
        }
    }
    async computeCriticalPath(goalNodeId) {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeRead(async (tx) => {
                const query = `
          MATCH path = (leaf)-[:DEPENDS_ON|IMPLEMENTS*]->(goal {id: $goalNodeId})
          WHERE NOT (leaf)<-[:DEPENDS_ON]-()
          WITH path, length(path) as pathLength
          ORDER BY pathLength DESC
          LIMIT 1
          RETURN [n IN nodes(path) | n.id] as criticalPath
        `;
                return tx.run(query, { goalNodeId });
            });
            if (result.records.length === 0)
                return [];
            return result.records[0].get('criticalPath');
        }
        finally {
            await session.close();
        }
    }
    // ============================================
    // Statistics
    // ============================================
    async getStats() {
        const session = this.driver.session({ database: this.database });
        try {
            const result = await session.executeRead(async (tx) => {
                const query = `
          MATCH (n)
          WITH count(n) as nodeCount, collect(labels(n)[0]) as nodeLabels
          MATCH ()-[r]->()
          WITH nodeCount, nodeLabels, count(r) as edgeCount, collect(type(r)) as edgeTypes
          MATCH (orphan)
          WHERE NOT (orphan)--()
          WITH nodeCount, nodeLabels, edgeCount, edgeTypes, count(orphan) as orphanCount
          RETURN nodeCount, nodeLabels, edgeCount, edgeTypes, orphanCount
        `;
                return tx.run(query);
            });
            const record = result.records[0];
            const nodeLabels = record.get('nodeLabels');
            const edgeTypes = record.get('edgeTypes');
            const nodesByType = {};
            nodeLabels.forEach((label) => {
                nodesByType[label] = (nodesByType[label] || 0) + 1;
            });
            const edgesByType = {};
            edgeTypes.forEach((type) => {
                edgesByType[type] = (edgesByType[type] || 0) + 1;
            });
            const nodeCount = record.get('nodeCount').toNumber();
            const edgeCount = record.get('edgeCount').toNumber();
            return {
                nodeCount,
                edgeCount,
                nodesByType,
                edgesByType,
                orphanNodes: record.get('orphanCount').toNumber(),
                avgDegree: nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0,
            };
        }
        finally {
            await session.close();
        }
    }
    // ============================================
    // Change Listeners
    // ============================================
    onChange(listener) {
        this.changeListeners.push(listener);
        return () => {
            const idx = this.changeListeners.indexOf(listener);
            if (idx >= 0)
                this.changeListeners.splice(idx, 1);
        };
    }
    emitChange(event) {
        this.changeListeners.forEach((listener) => listener(event));
    }
    // ============================================
    // Private Helpers
    // ============================================
    async ensureIndexes() {
        const session = this.driver.session({ database: this.database });
        try {
            const indexes = [
                'CREATE INDEX node_id IF NOT EXISTS FOR (n:Node) ON (n.id)',
                'CREATE INDEX intent_id IF NOT EXISTS FOR (n:Intent) ON (n.id)',
                'CREATE INDEX commitment_id IF NOT EXISTS FOR (n:Commitment) ON (n.id)',
                'CREATE INDEX epic_id IF NOT EXISTS FOR (n:Epic) ON (n.id)',
                'CREATE INDEX ticket_id IF NOT EXISTS FOR (n:Ticket) ON (n.id)',
                'CREATE INDEX ticket_status IF NOT EXISTS FOR (n:Ticket) ON (n.status)',
                'CREATE INDEX agent_id IF NOT EXISTS FOR (n:Agent) ON (n.id)',
                'CREATE INDEX pr_id IF NOT EXISTS FOR (n:PR) ON (n.id)',
            ];
            for (const idx of indexes) {
                await session.run(idx);
            }
        }
        finally {
            await session.close();
        }
    }
    getNodeLabel(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
    getEdgeLabel(type) {
        return type.toUpperCase().replace(/_/g, '_');
    }
    serializeNode(node) {
        const serialized = {};
        for (const [key, value] of Object.entries(node)) {
            if (value instanceof Date) {
                continue; // Handled separately
            }
            else if (value instanceof Map) {
                serialized[key] = Object.fromEntries(value);
            }
            else if (typeof value === 'object' && value !== null) {
                serialized[key] = JSON.stringify(value);
            }
            else {
                serialized[key] = value;
            }
        }
        return serialized;
    }
    serializeEdge(edge) {
        const serialized = {};
        for (const [key, value] of Object.entries(edge)) {
            if (key === 'sourceId' || key === 'targetId')
                continue;
            if (value instanceof Date) {
                continue;
            }
            else if (typeof value === 'object' && value !== null) {
                serialized[key] = JSON.stringify(value);
            }
            else {
                serialized[key] = value;
            }
        }
        return serialized;
    }
    deserializeNode(props) {
        const node = {};
        for (const [key, value] of Object.entries(props)) {
            if (key === 'createdAt' || key === 'updatedAt') {
                node[key] = new Date(value);
            }
            else if (typeof value === 'string' && value.startsWith('{')) {
                try {
                    node[key] = JSON.parse(value);
                }
                catch {
                    node[key] = value;
                }
            }
            else {
                node[key] = value;
            }
        }
        return node;
    }
    deserializeEdge(props) {
        const edge = {};
        for (const [key, value] of Object.entries(props)) {
            if (key === 'createdAt') {
                edge[key] = new Date(value);
            }
            else if (typeof value === 'string' && value.startsWith('{')) {
                try {
                    edge[key] = JSON.parse(value);
                }
                catch {
                    edge[key] = value;
                }
            }
            else {
                edge[key] = value;
            }
        }
        return edge;
    }
}
exports.Neo4jGraphStore = Neo4jGraphStore;
// ============================================
// In-Memory Graph Store (for testing/demo)
// ============================================
class InMemoryGraphStore {
    nodes = new Map();
    edges = new Map();
    async createNode(node) {
        this.nodes.set(node.id, node);
        return node;
    }
    async getNode(id) {
        return this.nodes.get(id) ?? null;
    }
    async getNodes(filter) {
        let results = Array.from(this.nodes.values());
        if (filter) {
            results = results.filter((node) => {
                for (const [key, value] of Object.entries(filter)) {
                    if (node[key] !== value)
                        return false;
                }
                return true;
            });
        }
        return results;
    }
    async updateNode(id, updates) {
        const node = this.nodes.get(id);
        if (!node)
            return null;
        const updated = { ...node, ...updates, updatedAt: new Date() };
        this.nodes.set(id, updated);
        return updated;
    }
    async deleteNode(id) {
        return this.nodes.delete(id);
    }
    async createEdge(edge) {
        this.edges.set(edge.id, edge);
        return edge;
    }
    async getEdges(filter) {
        let results = Array.from(this.edges.values());
        if (filter) {
            if (filter.sourceId)
                results = results.filter((e) => e.sourceId === filter.sourceId);
            if (filter.targetId)
                results = results.filter((e) => e.targetId === filter.targetId);
            if (filter.type)
                results = results.filter((e) => e.type === filter.type);
        }
        return results;
    }
    async deleteEdge(id) {
        return this.edges.delete(id);
    }
}
exports.InMemoryGraphStore = InMemoryGraphStore;
