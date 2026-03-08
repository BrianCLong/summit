import { getNeo4jDriver } from '../db/neo4j.js';
import { filterByTemporal } from '../canonical/types';

// Mock data store for fallback
const MOCK_ENTITIES: any[] = [
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

export const canonicalResolvers = {
  CanonicalEntity: {
    __resolveType(obj: any, context: any, info: any) {
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
    canonicalEntity: async (_: any, { id, temporal }: any, context: any) => {
      const driver = getNeo4jDriver();
      let entity = null;

      try {
        const session = driver.session();
        try {
          const result = await session.executeRead((tx: any) =>
            tx.run(`MATCH (n {id: $id}) RETURN n`, { id })
          );
          if (result.records.length > 0) {
            const node = result.records[0].get('n').properties;
            // Convert neo4j dates to JS dates if needed
            entity = { ...node };
          }
        } finally {
          await session.close();
        }
      } catch (e: any) {
        console.warn("Neo4j unavailable, using mock", e);
      }

      // Fallback to mock
      if (!entity) {
        entity = MOCK_ENTITIES.find(e => e.id === id);
      }

      if (!entity) return null;

      // Apply temporal filter
      if (temporal) {
        const filtered = filterByTemporal([entity], temporal);
        return filtered.length > 0 ? filtered[0] : null;
      }
      return entity;
    },

    canonicalPerson: async (_: any, { id, temporal }: any, context: any) => {
      // Re-use logic or specific query
      const driver = getNeo4jDriver();
      let entity = null;

      try {
        const session = driver.session();
        try {
          const result = await session.executeRead((tx: any) =>
            tx.run(`MATCH (n:Person {id: $id}) RETURN n`, { id })
          );
          if (result.records.length > 0) {
            const node = result.records[0].get('n').properties;
            entity = { ...node };
          }
        } finally {
          await session.close();
        }
      } catch (e: any) {
        console.warn("Neo4j unavailable, using mock", e);
      }

      if (!entity) {
        entity = MOCK_ENTITIES.find(e => e.id === id && e.entityType === 'Person');
      }

      if (!entity) return null;
      if (temporal) {
        const filtered = filterByTemporal([entity], temporal);
        return filtered.length > 0 ? filtered[0] : null;
      }
      return entity;
    },

    searchCanonicalEntities: async (_: any, { query, types, temporal, limit }: any, context: any) => {
      // Basic implementation
      const driver = getNeo4jDriver();
      let results: any[] = [];

      try {
        const session = driver.session();
        try {
          // Safe query with parameters
          const result = await session.executeRead((tx: any) =>
            tx.run(`
                       MATCH (n)
                       WHERE n.id CONTAINS $query OR n.name CONTAINS $query
                       RETURN n LIMIT $limit
                   `, { query, limit: parseInt(limit) || 50 })
          );
          results = result.records.map((r: any) => r.get('n').properties);
        } finally {
          await session.close();
        }
      } catch (e: any) {
        console.warn("Neo4j unavailable, using mock", e);
        results = MOCK_ENTITIES;
      }

      if (types && types.length > 0) {
        results = results.filter(e => types.includes(e.entityType));
      }

      if (temporal) {
        results = filterByTemporal(results, temporal);
      }

      return results.slice(0, limit);
    }
  }
};
