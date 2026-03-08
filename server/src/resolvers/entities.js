"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entitiesResolvers = void 0;
const neo4j_js_1 = require("../db/neo4j.js");
const neo4jDriver = (0, neo4j_js_1.getNeo4jDriver)();
// Helper to format Neo4j properties
const formatProperties = (properties) => {
    const formatted = {};
    for (const key in properties) {
        if (properties[key] && typeof properties[key] === 'object' && properties[key].low !== undefined) {
            formatted[key] = properties[key].low;
        }
        else {
            formatted[key] = properties[key];
        }
    }
    return formatted;
};
const resolveEntityType = (labels) => {
    if (labels.includes('Person'))
        return 'Person';
    if (labels.includes('Org'))
        return 'Org';
    if (labels.includes('Asset'))
        return 'Asset';
    if (labels.includes('Event'))
        return 'Event';
    if (labels.includes('Indicator'))
        return 'Indicator';
    return null;
};
exports.entitiesResolvers = {
    Query: {
        entityById: async (_parent, { id, tenant }) => {
            const session = neo4jDriver.session();
            try {
                const result = await session.run('MATCH (n {id: $id, tenant_id: $tenant}) RETURN n', { id, tenant });
                if (result.records.length === 0) {
                    return null;
                }
                const node = result.records[0].get('n');
                return {
                    ...formatProperties(node.properties),
                    labels: node.labels,
                };
            }
            finally {
                await session.close();
            }
        },
        searchEntities: async (_parent, { q, limit = 25, tenant }) => {
            const session = neo4jDriver.session();
            try {
                // Use the full-text index for efficient search
                const result = await session.run(`CALL db.index.fulltext.queryNodes("entity_search_index", $q) YIELD node, score
           WHERE node.tenant_id = $tenant
           RETURN node, score LIMIT $limit`, { q, tenant, limit });
                return result.records.map(record => {
                    const node = record.get('node');
                    return {
                        ...formatProperties(node.properties),
                        labels: node.labels,
                        score: record.get('score'),
                    };
                });
            }
            finally {
                await session.close();
            }
        },
        neighbors: async (_parent, { id, hops = 1, tenant }) => {
            const session = neo4jDriver.session();
            try {
                const maxHops = Math.min(hops, 3);
                const result = await session.run(`MATCH (startNode {id: $id, tenant_id: $tenant})-[*1..${maxHops}]-(neighbor)
           WHERE neighbor.tenant_id = $tenant
           RETURN DISTINCT neighbor`, { id, tenant });
                return result.records.map(record => {
                    const node = record.get('neighbor');
                    return {
                        ...formatProperties(node.properties),
                        labels: node.labels,
                    };
                });
            }
            finally {
                await session.close();
            }
        },
    },
    Entity: {
        __resolveType(entity) {
            return resolveEntityType(entity.labels);
        },
    },
};
