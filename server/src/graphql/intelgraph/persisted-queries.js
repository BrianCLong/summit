"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistedQueries = void 0;
exports.getPersistedQuery = getPersistedQuery;
exports.getAllQueryIds = getAllQueryIds;
exports.isQueryAllowed = isQueryAllowed;
exports.resolveQuery = resolveQuery;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Persisted queries for IntelGraph GraphQL API
 * Maps query IDs to actual GraphQL queries for security and performance
 */
exports.persistedQueries = new Map();
// Helper function to generate query hash
function generateQueryId(query) {
    return crypto_1.default.createHash('sha256').update(query).digest('hex');
}
// Core entity queries
const GET_ENTITY_BY_ID = `
  query GetEntityById($id: ID!) {
    entityById(id: $id) {
      id
      type
      name
      attributes
      sources {
        id
        system
        collectedAt
        reliability
      }
      degree
      confidence
      createdAt
      updatedAt
      retentionTier
      purpose
      region
    }
  }
`;
const SEARCH_ENTITIES = `
  query SearchEntities($query: String!, $filter: EntityFilter, $pagination: PaginationInput) {
    searchEntities(query: $query, filter: $filter, pagination: $pagination) {
      entities {
        id
        type
        name
        attributes
        degree
        confidence
        createdAt
        updatedAt
        purpose
        region
      }
      totalCount
      hasMore
      nextCursor
    }
  }
`;
const PATH_BETWEEN_ENTITIES = `
  query PathBetween($fromId: ID!, $toId: ID!, $maxHops: Int) {
    pathBetween(fromId: $fromId, toId: $toId, maxHops: $maxHops) {
      from
      to
      relType
      score
      properties
    }
  }
`;
const ENTITY_GRAPH = `
  query EntityGraph($centerEntityId: ID!, $depth: Int, $relationTypes: [String!]) {
    entityGraph(centerEntityId: $centerEntityId, depth: $depth, relationTypes: $relationTypes) {
      nodes {
        id
        label
        type
        weight
        properties
      }
      edges {
        id
        source
        target
        type
        weight
        properties
      }
      stats {
        nodeCount
        edgeCount
        density
        clustering
      }
    }
  }
`;
const GET_INDICATORS = `
  query GetIndicators($filter: EntityFilter, $pagination: PaginationInput) {
    indicators(filter: $filter, pagination: $pagination) {
      id
      iocType
      value
      confidence
      sources {
        id
        system
        collectedAt
      }
      relatedEntities {
        id
        type
        name
      }
      firstSeen
      lastSeen
      tags
    }
  }
`;
const GET_INSIGHTS = `
  query GetInsights($entityIds: [ID!]!, $insightTypes: [String!]) {
    insights(entityIds: $entityIds, insightTypes: $insightTypes) {
      type
      score
      entities {
        id
        type
        name
      }
      description
      evidence
    }
  }
`;
const HEALTH_CHECK = `
  query HealthCheck {
    health {
      status
      timestamp
      version
      components
      metrics
    }
  }
`;
// Register all persisted queries
const queries = [
    { name: 'getEntityById', query: GET_ENTITY_BY_ID },
    { name: 'searchEntities', query: SEARCH_ENTITIES },
    { name: 'pathBetween', query: PATH_BETWEEN_ENTITIES },
    { name: 'entityGraph', query: ENTITY_GRAPH },
    { name: 'getIndicators', query: GET_INDICATORS },
    { name: 'getInsights', query: GET_INSIGHTS },
    { name: 'healthCheck', query: HEALTH_CHECK },
];
// Build the persisted queries map
queries.forEach(({ name, query }) => {
    const id = generateQueryId(query);
    exports.persistedQueries.set(id, query);
    exports.persistedQueries.set(name, query); // Also allow lookup by name for dev
});
/**
 * Resolve persisted query by ID or name
 */
function getPersistedQuery(queryId) {
    return exports.persistedQueries.get(queryId);
}
/**
 * Get all registered query IDs for client-side registration
 */
function getAllQueryIds() {
    return queries.map(({ name, query }) => ({
        id: generateQueryId(query),
        name,
    }));
}
/**
 * Validate that a query is allowed (either persisted or in development mode)
 */
function isQueryAllowed(query, queryId) {
    // In development, allow any query
    if (process.env.NODE_ENV === 'development') {
        return true;
    }
    // In production, only allow persisted queries
    if (queryId) {
        return exports.persistedQueries.has(queryId);
    }
    // Check if the query matches any persisted query exactly
    if (query) {
        const queryHash = generateQueryId(query);
        return exports.persistedQueries.has(queryHash);
    }
    return false;
}
/**
 * Extract query from persisted query ID or validate inline query
 */
function resolveQuery(options) {
    const { query, queryId } = options;
    // Try persisted query first
    if (queryId) {
        const persistedQuery = getPersistedQuery(queryId);
        if (persistedQuery) {
            return { query: persistedQuery, isPersistedQuery: true };
        }
    }
    // Fallback to inline query (development only)
    if (query && isQueryAllowed(query)) {
        return { query, isPersistedQuery: false };
    }
    throw new Error('Query not allowed or not found in persisted queries');
}
exports.default = exports.persistedQueries;
