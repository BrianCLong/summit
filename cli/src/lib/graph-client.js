"use strict";
/**
 * Graph Database Client
 * Unified interface for Neo4j graph queries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphClient = void 0;
exports.createGraphClient = createGraphClient;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const zod_1 = require("zod");
const constants_js_1 = require("./constants.js");
const QueryOptionsSchema = zod_1.z.object({
    language: zod_1.z.enum(['cypher', 'gremlin', 'sparql']).default('cypher'),
    limit: zod_1.z.number().min(1).max(constants_js_1.MAX_QUERY_RESULTS).default(constants_js_1.DEFAULT_QUERY_LIMIT),
    timeout: zod_1.z.number().min(1000).default(constants_js_1.DEFAULT_TIMEOUT_MS),
    parameters: zod_1.z.record(zod_1.z.unknown()).default({}),
    database: zod_1.z.string().optional(),
    readOnly: zod_1.z.boolean().default(true),
});
class GraphClient {
    driver = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        if (this.driver)
            return;
        const auth = this.config.password
            ? neo4j_driver_1.default.auth.basic(this.config.user, this.config.password)
            : undefined;
        this.driver = neo4j_driver_1.default.driver(this.config.uri, auth, {
            encrypted: this.config.encrypted ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
            maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
            maxConnectionPoolSize: 50,
            connectionAcquisitionTimeout: 60 * 1000, // 60 seconds
        });
        // Verify connectivity
        await this.driver.verifyConnectivity();
    }
    async disconnect() {
        if (this.driver) {
            await this.driver.close();
            this.driver = null;
        }
    }
    async query(queryString, options = {}) {
        const opts = QueryOptionsSchema.parse(options);
        if (!this.driver) {
            await this.connect();
        }
        const session = this.driver.session({
            database: opts.database || this.config.database,
            defaultAccessMode: opts.readOnly ? neo4j_driver_1.default.session.READ : neo4j_driver_1.default.session.WRITE,
        });
        try {
            const result = await session.run(queryString, opts.parameters, {
                timeout: opts.timeout,
            });
            return this.transformQueryResult(result);
        }
        finally {
            await session.close();
        }
    }
    async queryNodes(label, properties, options = {}) {
        const labelClause = label ? `:${label}` : '';
        const whereClause = properties
            ? Object.keys(properties)
                .map((k, i) => `n.${k} = $prop${i}`)
                .join(' AND ')
            : '';
        const params = {};
        if (properties) {
            Object.values(properties).forEach((v, i) => {
                params[`prop${i}`] = v;
            });
        }
        const query = `
      MATCH (n${labelClause})
      ${whereClause ? `WHERE ${whereClause}` : ''}
      RETURN n
      LIMIT $limit
    `;
        const result = await this.query(query, {
            ...options,
            parameters: { ...params, limit: neo4j_driver_1.default.int(options.limit || constants_js_1.DEFAULT_QUERY_LIMIT) },
        });
        return result.rows.map((row) => this.nodeToResult(row[0]));
    }
    async queryRelationships(type, options = {}) {
        const typeClause = type ? `:${type}` : '';
        const query = `
      MATCH ()-[r${typeClause}]->()
      RETURN r
      LIMIT $limit
    `;
        const result = await this.query(query, {
            ...options,
            parameters: { limit: neo4j_driver_1.default.int(options.limit || constants_js_1.DEFAULT_QUERY_LIMIT) },
        });
        return result.rows.map((row) => this.relationshipToResult(row[0]));
    }
    async findPaths(startId, endId, options = {}) {
        const maxDepth = options.maxDepth || 5;
        const query = `
      MATCH path = shortestPath((start)-[*1..${maxDepth}]-(end))
      WHERE elementId(start) = $startId AND elementId(end) = $endId
      RETURN path
      LIMIT $limit
    `;
        const result = await this.query(query, {
            ...options,
            parameters: {
                startId,
                endId,
                limit: neo4j_driver_1.default.int(options.limit || 10),
            },
        });
        return result.rows.map((row) => this.pathToResult(row[0]));
    }
    async getNeighbors(nodeId, direction = 'both', options = {}) {
        const directionPattern = direction === 'in' ? '<-[]-' : direction === 'out' ? '-[]->' : '-[]-';
        const query = `
      MATCH (n)${directionPattern}(neighbor)
      WHERE elementId(n) = $nodeId
      RETURN DISTINCT neighbor
      LIMIT $limit
    `;
        const result = await this.query(query, {
            ...options,
            parameters: {
                nodeId,
                limit: neo4j_driver_1.default.int(options.limit || constants_js_1.DEFAULT_QUERY_LIMIT),
            },
        });
        return result.rows.map((row) => this.nodeToResult(row[0]));
    }
    async getStats() {
        const [nodeCountResult, relCountResult, labelsResult, typesResult] = await Promise.all([
            this.query('MATCH (n) RETURN count(n) as count'),
            this.query('MATCH ()-[r]->() RETURN count(r) as count'),
            this.query('CALL db.labels() YIELD label RETURN collect(label) as labels'),
            this.query('CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) as types'),
        ]);
        return {
            nodeCount: this.toNumber(nodeCountResult.rows[0]?.[0]),
            relationshipCount: this.toNumber(relCountResult.rows[0]?.[0]),
            labels: labelsResult.rows[0]?.[0] || [],
            relationshipTypes: typesResult.rows[0]?.[0] || [],
        };
    }
    async explain(query) {
        const result = await this.query(`EXPLAIN ${query}`);
        const plan = result.summary;
        return {
            plan: JSON.stringify(plan, null, 2),
            estimatedRows: 0,
            dbHits: 0,
        };
    }
    async healthCheck() {
        const start = Date.now();
        try {
            if (!this.driver) {
                await this.connect();
            }
            await this.query('RETURN 1 as ping');
            const latencyMs = Date.now() - start;
            const serverInfo = await this.driver.getServerInfo();
            return {
                connected: true,
                latencyMs,
                serverInfo: {
                    version: serverInfo.protocolVersion?.toString() || 'unknown',
                    edition: 'community',
                },
            };
        }
        catch {
            return {
                connected: false,
                latencyMs: Date.now() - start,
            };
        }
    }
    transformQueryResult(result) {
        const records = result.records;
        const summary = result.summary;
        const columns = records.length > 0 ? records[0].keys.map(String) : [];
        const rows = records.map((record) => record.keys.map((key) => this.transformValue(record.get(key))));
        const counters = summary.counters.updates();
        return {
            columns,
            rows,
            summary: {
                resultAvailableAfter: this.toNumber(summary.resultAvailableAfter),
                resultConsumedAfter: this.toNumber(summary.resultConsumedAfter),
                counters: {
                    nodesCreated: counters.nodesCreated,
                    nodesDeleted: counters.nodesDeleted,
                    relationshipsCreated: counters.relationshipsCreated,
                    relationshipsDeleted: counters.relationshipsDeleted,
                    propertiesSet: counters.propertiesSet,
                    labelsAdded: counters.labelsAdded,
                    labelsRemoved: counters.labelsRemoved,
                },
                queryType: summary.queryType,
            },
            totalRows: rows.length,
        };
    }
    transformValue(value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (neo4j_driver_1.default.isInt(value)) {
            return value.toNumber();
        }
        if (neo4j_driver_1.default.isNode(value)) {
            return this.nodeToResult(value);
        }
        if (neo4j_driver_1.default.isRelationship(value)) {
            return this.relationshipToResult(value);
        }
        if (neo4j_driver_1.default.isPath(value)) {
            return this.pathToResult(value);
        }
        if (Array.isArray(value)) {
            return value.map((v) => this.transformValue(v));
        }
        if (typeof value === 'object') {
            const obj = {};
            for (const [k, v] of Object.entries(value)) {
                obj[k] = this.transformValue(v);
            }
            return obj;
        }
        return value;
    }
    nodeToResult(node) {
        return {
            id: node.elementId,
            labels: node.labels,
            properties: this.transformProperties(node.properties),
        };
    }
    relationshipToResult(rel) {
        return {
            id: rel.elementId,
            type: rel.type,
            startNodeId: rel.startNodeElementId,
            endNodeId: rel.endNodeElementId,
            properties: this.transformProperties(rel.properties),
        };
    }
    pathToResult(path) {
        return {
            nodes: path.segments.map((s) => this.nodeToResult(s.start)).concat(path.segments.length > 0
                ? [this.nodeToResult(path.segments[path.segments.length - 1].end)]
                : []),
            relationships: path.segments.map((s) => this.relationshipToResult(s.relationship)),
            length: path.length,
        };
    }
    transformProperties(props) {
        const result = {};
        for (const [key, value] of Object.entries(props)) {
            result[key] = this.transformValue(value);
        }
        return result;
    }
    toNumber(value) {
        if (neo4j_driver_1.default.isInt(value)) {
            return value.toNumber();
        }
        return typeof value === 'number' ? value : 0;
    }
}
exports.GraphClient = GraphClient;
function createGraphClient(config) {
    return new GraphClient(config);
}
