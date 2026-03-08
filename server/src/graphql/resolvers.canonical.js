"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalResolvers = void 0;
const neo4j_js_1 = require("../db/neo4j.js");
const types_js_1 = require("../canonical/types.js");
// Mock data store for fallback
const MOCK_ENTITIES = [
    {
        id: 'person-1',
        tenantId: 'default',
        entityType: 'Person',
        schemaVersion: '1.0.0',
        validFrom: new Date('2023-01-01'),
        validTo: null,
        observedAt: new Date('2023-01-01'),
        recordedAt: new Date('2023-01-01'),
        provenanceId: 'prov-1',
        name: { full: 'John Doe' }
    }
];
exports.canonicalResolvers = {
    CanonicalEntity: {
        __resolveType(obj, context, info) {
            if (obj.entityType === 'Person') {
                return 'Person';
            }
            if (obj.entityType === 'Organization') {
                return 'Organization';
            }
            return 'GenericCanonicalEntity';
        },
    },
    Query: {
        canonicalEntity: async (_, { id, temporal }, context) => {
            const driver = (0, neo4j_js_1.getNeo4jDriver)();
            let entity = null;
            try {
                const session = driver.session();
                try {
                    const result = await session.executeRead((tx) => tx.run(`MATCH (n {id: $id}) RETURN n`, { id }));
                    if (result.records.length > 0) {
                        const node = result.records[0].get('n').properties;
                        // Convert neo4j dates to JS dates if needed
                        entity = { ...node };
                    }
                }
                finally {
                    await session.close();
                }
            }
            catch (e) {
                console.warn("Neo4j unavailable, using mock", e);
            }
            // Fallback to mock
            if (!entity) {
                entity = MOCK_ENTITIES.find(e => e.id === id);
            }
            if (!entity)
                return null;
            // Apply temporal filter
            if (temporal) {
                const filtered = (0, types_js_1.filterByTemporal)([entity], temporal);
                return filtered.length > 0 ? filtered[0] : null;
            }
            return entity;
        },
        canonicalPerson: async (_, { id, temporal }, context) => {
            // Re-use logic or specific query
            const driver = (0, neo4j_js_1.getNeo4jDriver)();
            let entity = null;
            try {
                const session = driver.session();
                try {
                    const result = await session.executeRead((tx) => tx.run(`MATCH (n:Person {id: $id}) RETURN n`, { id }));
                    if (result.records.length > 0) {
                        const node = result.records[0].get('n').properties;
                        entity = { ...node };
                    }
                }
                finally {
                    await session.close();
                }
            }
            catch (e) {
                console.warn("Neo4j unavailable, using mock", e);
            }
            if (!entity) {
                entity = MOCK_ENTITIES.find(e => e.id === id && e.entityType === 'Person');
            }
            if (!entity)
                return null;
            if (temporal) {
                const filtered = (0, types_js_1.filterByTemporal)([entity], temporal);
                return filtered.length > 0 ? filtered[0] : null;
            }
            return entity;
        },
        searchCanonicalEntities: async (_, { query, types, temporal, limit }, context) => {
            // Basic implementation
            const driver = (0, neo4j_js_1.getNeo4jDriver)();
            let results = [];
            try {
                const session = driver.session();
                try {
                    // Safe query with parameters
                    const result = await session.executeRead((tx) => tx.run(`
                       MATCH (n)
                       WHERE n.id CONTAINS $query OR n.name CONTAINS $query
                       RETURN n LIMIT $limit
                   `, { query, limit: parseInt(limit) || 50 }));
                    results = result.records.map((r) => r.get('n').properties);
                }
                finally {
                    await session.close();
                }
            }
            catch (e) {
                console.warn("Neo4j unavailable, using mock", e);
                results = MOCK_ENTITIES;
            }
            if (types && types.length > 0) {
                results = results.filter(e => types.includes(e.entityType));
            }
            if (temporal) {
                results = (0, types_js_1.filterByTemporal)(results, temporal);
            }
            return results.slice(0, limit);
        }
    }
};
