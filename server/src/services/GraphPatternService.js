"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphPatternService = void 0;
const neo4j_js_1 = require("../graph/neo4j.js");
const graphTenantScope_js_1 = require("./graphTenantScope.js");
// Helper to sanitize attribute keys to prevent injection
function sanitizeKey(key) {
    return key.replace(/[^a-zA-Z0-9_]/g, '');
}
// Helper to unflatten attributes from storage (duplicated for standalone service, ideally shared util)
function unflattenAttributes(properties, prefix = 'attr_') {
    const attributes = {};
    for (const [k, v] of Object.entries(properties)) {
        if (k.startsWith(prefix)) {
            const key = k.substring(prefix.length);
            if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
                try {
                    attributes[key] = JSON.parse(v);
                }
                catch {
                    attributes[key] = v;
                }
            }
            else {
                attributes[key] = v;
            }
        }
    }
    return attributes;
}
class GraphPatternService {
    static instance;
    static getInstance() {
        if (!GraphPatternService.instance) {
            GraphPatternService.instance = new GraphPatternService();
        }
        return GraphPatternService.instance;
    }
    async search(query) {
        const { tenantId, pattern, limit = 100 } = query;
        let cypherParts = [];
        let whereParts = [];
        const params = { tenantId };
        // Sanitize aliases to prevent injection
        const sanitizeAlias = (alias) => alias.replace(/[^a-zA-Z0-9_]/g, '');
        // 1. MATCH Clauses
        const nodeDefs = pattern.nodes.map(n => {
            const safeAlias = sanitizeAlias(n.alias);
            return `(${safeAlias}:Entity {tenantId: $tenantId})`;
        }).join(', ');
        if (nodeDefs)
            cypherParts.push(`MATCH ${nodeDefs}`);
        if (pattern.edges.length > 0) {
            const edgeDefs = pattern.edges.map((e, idx) => {
                const safeFrom = sanitizeAlias(e.from);
                const safeTo = sanitizeAlias(e.to);
                const arrow = e.directed ? '->' : '-';
                return `(${safeFrom})-[r${idx}:Edge {tenantId: $tenantId}]${arrow}(${safeTo})`;
            }).join(', ');
            cypherParts.push(`MATCH ${edgeDefs}`);
        }
        // 2. Filters (Types, Attributes)
        pattern.nodes.forEach((node) => {
            const safeAlias = sanitizeAlias(node.alias);
            if (node.types && node.types.length > 0) {
                whereParts.push(`${safeAlias}.type IN $types_${safeAlias}`);
                params[`types_${safeAlias}`] = node.types;
            }
            if (node.attributes) {
                Object.entries(node.attributes).forEach(([k, v], i) => {
                    const safeKey = sanitizeKey(k);
                    whereParts.push(`${safeAlias}.attr_${safeKey} = $attr_${safeAlias}_${i}`);
                    params[`attr_${safeAlias}_${i}`] = v;
                });
            }
        });
        pattern.edges.forEach((edge, idx) => {
            if (edge.types && edge.types.length > 0) {
                whereParts.push(`type(r${idx}) IN $types_r${idx}`);
                params[`types_r${idx}`] = edge.types;
            }
            if (edge.attributes) {
                Object.entries(edge.attributes).forEach(([k, v], i) => {
                    const safeKey = sanitizeKey(k);
                    whereParts.push(`r${idx}.attr_${safeKey} = $attr_r${idx}_${i}`);
                    params[`attr_r${idx}_${i}`] = v;
                });
            }
        });
        if (whereParts.length > 0) {
            cypherParts.push(`WHERE ${whereParts.join(' AND ')}`);
        }
        // 3. Return
        const returnNodes = pattern.nodes.map(n => sanitizeAlias(n.alias)).join(', ');
        const returnEdges = pattern.edges.map((e, idx) => `r${idx}`).join(', ');
        const returnClause = returnEdges ? `RETURN ${returnNodes}, ${returnEdges}` : `RETURN ${returnNodes}`;
        cypherParts.push(returnClause);
        cypherParts.push(`LIMIT toInteger($limit)`);
        params.limit = limit;
        const fullCypher = cypherParts.join(' ');
        const scoped = await (0, graphTenantScope_js_1.enforceTenantScopeForCypher)(fullCypher, params, {
            tenantId,
            action: 'graph.read',
            resource: 'graph.pattern.search',
        });
        const results = await (0, neo4j_js_1.runCypher)(scoped.cypher, scoped.params, { tenantId });
        // Map results
        return results.map((rec) => {
            const record = rec;
            const nodes = [];
            const edges = [];
            pattern.nodes.forEach(n => {
                const safeAlias = sanitizeAlias(n.alias);
                const nodeObj = record[safeAlias];
                if (nodeObj) {
                    nodes.push({
                        ...nodeObj,
                        attributes: unflattenAttributes(nodeObj),
                        metadata: typeof nodeObj.metadata === 'string' ? JSON.parse(nodeObj.metadata) : nodeObj.metadata || {}
                    });
                }
            });
            pattern.edges.forEach((e, idx) => {
                const edgeObj = record[`r${idx}`];
                if (edgeObj) {
                    // Infer from/to IDs from nodes in the record if needed,
                    // but Neo4j driver relationship objects (if returned raw) have start/end.
                    // If runCypher returns plain object, we might lose start/end unless we explicitly return them in cypher map projection.
                    // But for now, let's assume we can infer from the node aliases in the same record.
                    const safeFrom = sanitizeAlias(e.from);
                    const safeTo = sanitizeAlias(e.to);
                    const fromId = record[safeFrom]?.id;
                    const toId = record[safeTo]?.id;
                    edges.push({
                        ...edgeObj,
                        fromEntityId: fromId,
                        toEntityId: toId,
                        type: edgeObj.type,
                        attributes: unflattenAttributes(edgeObj),
                        metadata: typeof edgeObj.metadata === 'string' ? JSON.parse(edgeObj.metadata) : edgeObj.metadata || {}
                    });
                }
            });
            return { nodes, edges };
        });
    }
}
exports.GraphPatternService = GraphPatternService;
