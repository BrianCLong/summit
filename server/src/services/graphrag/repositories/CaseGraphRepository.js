"use strict";
/**
 * Case Graph Repository
 * Retrieves subgraphs from Neo4j for a given case/investigation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCaseGraphRepository = exports.Neo4jCaseGraphRepository = void 0;
exports.createCaseGraphRepository = createCaseGraphRepository;
const neo4j_js_1 = require("../../../graph/neo4j.js");
const logger_js_1 = __importDefault(require("../../../utils/logger.js"));
const DEFAULT_MAX_NODES = 100;
const DEFAULT_MAX_DEPTH = 3;
class Neo4jCaseGraphRepository {
    /**
     * Get the subgraph associated with a case/investigation
     */
    async getCaseSubgraph(caseId, params) {
        const maxNodes = params?.maxNodes ?? DEFAULT_MAX_NODES;
        const maxDepth = params?.maxDepth ?? DEFAULT_MAX_DEPTH;
        const nodeTypeFilters = params?.nodeTypeFilters ?? [];
        try {
            // Build node type filter clause
            const typeFilterClause = nodeTypeFilters.length > 0
                ? `AND ANY(label IN labels(n) WHERE label IN $nodeTypes)`
                : '';
            // Query to get nodes connected to the case
            const nodesQuery = `
        MATCH (c:Case {id: $caseId})
        OPTIONAL MATCH path = (c)-[*1..${maxDepth}]-(n)
        WHERE n <> c ${typeFilterClause}
        WITH DISTINCT n
        LIMIT $maxNodes
        RETURN
          n.id AS id,
          labels(n)[0] AS type,
          coalesce(n.name, n.label, n.title, n.id) AS label,
          properties(n) AS properties
      `;
            // Query to get edges within the subgraph
            const edgesQuery = `
        MATCH (c:Case {id: $caseId})
        OPTIONAL MATCH path = (c)-[*1..${maxDepth}]-(n)
        WHERE n <> c ${typeFilterClause}
        WITH DISTINCT n
        LIMIT $maxNodes
        WITH collect(n) + c AS subgraphNodes
        UNWIND subgraphNodes AS source
        MATCH (source)-[r]->(target)
        WHERE target IN subgraphNodes
        RETURN DISTINCT
          id(r) AS id,
          type(r) AS type,
          source.id AS fromId,
          target.id AS toId,
          properties(r) AS properties
      `;
            const [nodesResult, edgesResult] = await Promise.all([
                (0, neo4j_js_1.runCypher)(nodesQuery, {
                    caseId,
                    maxNodes,
                    nodeTypes: nodeTypeFilters,
                }),
                (0, neo4j_js_1.runCypher)(edgesQuery, {
                    caseId,
                    maxNodes,
                    nodeTypes: nodeTypeFilters,
                }),
            ]);
            // Add the case node itself
            const caseNodeResult = await (0, neo4j_js_1.runCypher)(`
        MATCH (c:Case {id: $caseId})
        RETURN
          c.id AS id,
          'Case' AS type,
          coalesce(c.name, c.title, c.id) AS label,
          properties(c) AS properties
      `, { caseId });
            const nodes = [
                ...caseNodeResult.map((row) => ({
                    id: row.id,
                    type: row.type,
                    label: row.label,
                    properties: this.sanitizeProperties(row.properties),
                })),
                ...nodesResult
                    .filter((row) => row.id !== null)
                    .map((row) => ({
                    id: row.id,
                    type: row.type,
                    label: row.label,
                    properties: this.sanitizeProperties(row.properties),
                })),
            ];
            const edges = edgesResult
                .filter((row) => row.fromId && row.toId)
                .map((row) => ({
                id: String(row.id),
                type: row.type,
                fromId: row.fromId,
                toId: row.toId,
                properties: this.sanitizeProperties(row.properties),
            }));
            logger_js_1.default.debug({
                message: 'Case subgraph retrieved',
                caseId,
                nodeCount: nodes.length,
                edgeCount: edges.length,
                maxNodes,
                maxDepth,
            });
            return { nodes, edges };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to retrieve case subgraph',
                caseId,
                error: error instanceof Error ? error.message : String(error),
            });
            // Return empty graph on error to allow graceful degradation
            return { nodes: [], edges: [] };
        }
    }
    /**
     * Execute a targeted Cypher query to retrieve a subgraph
     * STRICT GOVERNANCE: Query MUST be scoped to $caseId
     */
    async getSubgraphByCypher(caseId, cypher, params = {}) {
        // 1. Governance: Ensure strict scoping
        if (!cypher.includes('$caseId')) {
            logger_js_1.default.warn({
                message: 'Cypher query rejected: Missing $caseId scope',
                caseId,
                cypher,
            });
            throw new Error('Security Violation: Cypher query must be scoped to the active Case ID.');
        }
        try {
            // 2. Execute Query
            const result = await (0, neo4j_js_1.runCypher)(cypher, { caseId, ...params });
            // 3. Parse Result into GraphContext
            // This is a generic parser that looks for Nodes, Relationships, and Paths in the result
            const nodesMap = new Map();
            const edgesMap = new Map();
            const processNode = (node) => {
                if (!node || !node.identity)
                    return;
                const id = String(node.identity); // Handle Neo4j Integer
                // Try to get UUID if available, else use Neo4j ID
                const realId = node.properties?.id || id;
                if (!nodesMap.has(realId)) {
                    nodesMap.set(realId, {
                        id: realId,
                        type: node.labels ? node.labels[0] : 'Unknown',
                        label: node.properties?.name || node.properties?.label || node.properties?.title || realId,
                        properties: this.sanitizeProperties(node.properties),
                    });
                }
            };
            const processEdge = (edge) => {
                if (!edge || !edge.identity)
                    return;
                const id = String(edge.identity);
                const start = String(edge.start);
                const end = String(edge.end);
                // We need to resolve start/end to our node IDs.
                // Note: runCypher returns objects where start/end are Integers matching identity of nodes
                // BUT we might not have the node objects if the query didn't return them.
                // Assuming the query returns paths or complete structures.
                // This parser is best-effort. In a real system, we'd query for IDs specifically.
                // For now, use the IDs we found in nodesMap or fallback.
                if (!edgesMap.has(id)) {
                    edgesMap.set(id, {
                        id,
                        type: edge.type,
                        fromId: start, // This is raw Neo4j ID, might need mapping if we use UUIDs
                        toId: end,
                        properties: this.sanitizeProperties(edge.properties),
                    });
                }
            };
            const processPath = (path) => {
                if (!path || !path.segments)
                    return;
                for (const segment of path.segments) {
                    processNode(segment.start);
                    processNode(segment.end);
                    processEdge(segment.relationship);
                }
            };
            for (const row of result) {
                // Iterate over all columns in the row
                for (const val of Object.values(row)) {
                    if (val && typeof val === 'object') {
                        // Check if Path
                        if (val.segments) {
                            processPath(val);
                        }
                        // Check if Node (has labels and properties)
                        else if (val.labels && val.properties) {
                            processNode(val);
                        }
                        // Check if Relationship (has type and properties)
                        else if (val.type && val.properties) {
                            processEdge(val); // Edge processing might be tricky without start/end context
                        }
                    }
                }
            }
            const nodes = Array.from(nodesMap.values());
            const edges = Array.from(edgesMap.values());
            logger_js_1.default.info({
                message: 'Cypher subgraph retrieved',
                caseId,
                nodeCount: nodes.length,
                edgeCount: edges.length,
            });
            return { nodes, edges };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to retrieve Cypher subgraph',
                caseId,
                cypher,
                error: error instanceof Error ? error.message : String(error),
            });
            return { nodes: [], edges: [] };
        }
    }
    /**
     * Sanitize properties to remove sensitive/large fields
     */
    sanitizeProperties(props) {
        if (!props)
            return {};
        const sensitiveKeys = [
            'password',
            'secret',
            'token',
            'credential',
            'api_key',
            'apiKey',
        ];
        const largeFieldMaxLength = 500;
        const sanitized = {};
        for (const [key, value] of Object.entries(props)) {
            // Skip sensitive fields
            if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
                continue;
            }
            // Truncate large string values
            if (typeof value === 'string' && value.length > largeFieldMaxLength) {
                sanitized[key] = value.substring(0, largeFieldMaxLength) + '...';
            }
            else if (value !== null && value !== undefined) {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
}
exports.Neo4jCaseGraphRepository = Neo4jCaseGraphRepository;
/**
 * In-memory implementation for testing
 */
class InMemoryCaseGraphRepository {
    nodes = new Map();
    edges = new Map();
    addCaseData(caseId, nodes, edges) {
        this.nodes.set(caseId, nodes);
        this.edges.set(caseId, edges);
    }
    async getCaseSubgraph(caseId, params) {
        const maxNodes = params?.maxNodes ?? DEFAULT_MAX_NODES;
        const nodeTypeFilters = params?.nodeTypeFilters ?? [];
        let nodes = this.nodes.get(caseId) ?? [];
        let edges = this.edges.get(caseId) ?? [];
        // Apply type filters
        if (nodeTypeFilters.length > 0) {
            nodes = nodes.filter((n) => !n.type || nodeTypeFilters.includes(n.type));
        }
        // Apply max nodes limit
        nodes = nodes.slice(0, maxNodes);
        // Filter edges to only include those with both endpoints in nodes
        const nodeIds = new Set(nodes.map((n) => n.id));
        edges = edges.filter((e) => nodeIds.has(e.fromId) && nodeIds.has(e.toId));
        return { nodes, edges };
    }
    async getSubgraphByCypher(caseId, cypher, params = {}) {
        // In-memory mock always returns empty for custom Cypher
        // unless we strictly mock the specific query logic, which is hard.
        return { nodes: [], edges: [] };
    }
    clear() {
        this.nodes.clear();
        this.edges.clear();
    }
}
exports.InMemoryCaseGraphRepository = InMemoryCaseGraphRepository;
function createCaseGraphRepository() {
    // Use Neo4j in production, in-memory for tests
    if (process.env.NODE_ENV === 'test') {
        return new InMemoryCaseGraphRepository();
    }
    return new Neo4jCaseGraphRepository();
}
