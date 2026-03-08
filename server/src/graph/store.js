"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphStore = void 0;
// @ts-nocheck
const neo4j_js_1 = require("./neo4j.js");
const uuid_1 = require("uuid");
class GraphStore {
    /**
     * Upsert a node in the graph.
     * Handles tenant isolation and time-travel versioning implicitly (simplified: current state).
     */
    async upsertNode(node) {
        const query = `
      MERGE (n:GraphNode { globalId: $globalId })
      ON CREATE SET
        n.createdAt = datetime(),
        n.validFrom = datetime(),
        n.tenantId = $tenantId,
        n.entityType = $entityType
      ON MATCH SET
        n.updatedAt = datetime()

      SET n += $attributes
      SET n.epistemic = $epistemicStr
      SET n.sourceRefs = $sourceRefsStr

      // Add specific label dynamically
      WITH n
      CALL apoc.create.addLabels(n, [$entityType]) YIELD node
      RETURN node
    `;
        const params = {
            globalId: node.globalId,
            tenantId: node.tenantId,
            entityType: node.entityType,
            attributes: node.attributes || {},
            epistemicStr: JSON.stringify(node.epistemic || {}),
            sourceRefsStr: JSON.stringify(node.sourceRefs || [])
        };
        await (0, neo4j_js_1.runCypher)(query, params, {
            tenantId: node.tenantId,
            caseId: node?.caseId,
            write: true,
        });
    }
    /**
     * Upsert an edge between two nodes.
     */
    async upsertEdge(edge) {
        const query = `
      MATCH (s:GraphNode { globalId: $sourceId, tenantId: $tenantId })
      MATCH (t:GraphNode { globalId: $targetId, tenantId: $tenantId })
      MERGE (s)-[r:${edge.edgeType}]->(t)
      ON CREATE SET
        r.id = $edgeId,
        r.createdAt = datetime(),
        r.validFrom = datetime(),
        r.tenantId = $tenantId
      ON MATCH SET
        r.updatedAt = datetime()

      SET r += $attributes
      SET r.epistemic = $epistemicStr
      SET r.sourceRefs = $sourceRefsStr
    `;
        const params = {
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            edgeType: edge.edgeType,
            tenantId: edge.tenantId,
            edgeId: edge.id || (0, uuid_1.v4)(),
            attributes: edge.attributes || {},
            epistemicStr: JSON.stringify(edge.epistemic || {}),
            sourceRefsStr: JSON.stringify(edge.sourceRefs || [])
        };
        await (0, neo4j_js_1.runCypher)(query, params, {
            tenantId: edge.tenantId,
            caseId: edge?.caseId,
            write: true,
        });
    }
    /**
     * Fetch a node by ID.
     */
    async getNode(globalId, tenantId) {
        const query = `
      MATCH (n:GraphNode { globalId: $globalId, tenantId: $tenantId })
      RETURN n
    `;
        const results = await (0, neo4j_js_1.runCypher)(query, { globalId, tenantId }, { tenantId });
        if (results.length === 0)
            return null;
        const record = results[0].n.properties;
        return this.mapNeo4jToEntity(record);
    }
    /**
     * Helper to deserialize Neo4j props back to TS object
     */
    mapNeo4jToEntity(props) {
        return {
            globalId: props.globalId,
            tenantId: props.tenantId,
            entityType: props.entityType,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt,
            validFrom: props.validFrom,
            validTo: props.validTo,
            sourceRefs: props.sourceRefs ? JSON.parse(props.sourceRefs) : [],
            epistemic: props.epistemic ? JSON.parse(props.epistemic) : {},
            attributes: Object.keys(props).reduce((acc, key) => {
                if (!['globalId', 'tenantId', 'entityType', 'createdAt', 'updatedAt', 'validFrom', 'validTo', 'sourceRefs', 'epistemic'].includes(key)) {
                    acc[key] = props[key];
                }
                return acc;
            }, {})
        };
    }
    /**
     * Query neighbors
     */
    async getNeighbors(globalId, tenantId, edgeTypes = [], depth = 1) {
        const typeClause = edgeTypes.length > 0 ? `:${edgeTypes.join('|')}` : '';
        const query = `
      MATCH (n:GraphNode { globalId: $globalId, tenantId: $tenantId })-[r${typeClause}*1..${depth}]-(m)
      RETURN m, r
    `;
        return await (0, neo4j_js_1.runCypher)(query, { globalId, tenantId }, { tenantId });
    }
    /**
     * Find a node by a specific attribute.
     * Useful for Entity Resolution.
     */
    async findNodeByAttribute(tenantId, attribute, value) {
        // Only allow specific safe attributes or validate input
        if (!['name', 'email', 'externalId'].includes(attribute) && !attribute.startsWith('source_')) {
            throw new Error(`Attribute lookup not allowed for: ${attribute}`);
        }
        const query = `
      MATCH (n:GraphNode { tenantId: $tenantId })
      WHERE n.attributes.${attribute} = $value
      RETURN n
    `;
        const results = await (0, neo4j_js_1.runCypher)(query, { tenantId, value }, { tenantId });
        if (results.length === 0)
            return null;
        return this.mapNeo4jToEntity(results[0].n.properties);
    }
    /**
     * Expose raw Cypher execution for internal engines like CKP.
     */
    async runCypher(cypher, params, options = {}) {
        return (0, neo4j_js_1.runCypher)(cypher, params, options);
    }
}
exports.GraphStore = GraphStore;
