// Inventory Graph GraphQL Schema - v1.0
// Entity nodes/edges (host↔user↔account↔asset), pagination, permission-aware

const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Query {
    """
    Get entity graph for a given entity
    """
    entityGraph(
      entityId: ID!
      entityType: EntityType!
      depth: Int = 2
      limit: Int = 100
      offset: Int = 0
      filters: GraphFilters
    ): EntityGraph!

    """
    Get attack paths from source to target
    """
    attackPaths(
      sourceId: ID!
      targetId: ID!
      maxDepth: Int = 5
      limit: Int = 10
    ): [AttackPath!]!

    """
    Get entity ownership context
    """
    entityOwnership(
      entityId: ID!
      entityType: EntityType!
    ): OwnershipContext!

    """
    Search graph entities
    """
    searchGraph(
      query: String!
      entityTypes: [EntityType!]
      limit: Int = 50
      offset: Int = 0
    ): GraphSearchResult!
  }

  type Mutation {
    """
    Export graph as PNG
    """
    exportGraph(
      entityId: ID!
      format: ExportFormat!
      layout: GraphLayout
    ): ExportResult!
  }

  """
  Entity types in the graph
  """
  enum EntityType {
    HOST
    USER
    ACCOUNT
    ASSET
    IP
    DOMAIN
    SERVICE
    PROCESS
  }

  """
  Graph export formats
  """
  enum ExportFormat {
    PNG
    SVG
    JSON
    GRAPHML
  }

  """
  Graph layout algorithms
  """
  enum GraphLayout {
    FORCE_DIRECTED
    HIERARCHICAL
    CIRCULAR
    RADIAL
  }

  """
  Graph filters
  """
  input GraphFilters {
    relationshipTypes: [String!]
    minRiskScore: Float
    maxRiskScore: Float
    timeRange: TimeRangeInput
    excludeTypes: [EntityType!]
  }

  """
  Time range filter
  """
  input TimeRangeInput {
    start: String
    end: String
  }

  """
  Entity graph response
  """
  type EntityGraph {
    centerEntity: GraphEntity!
    nodes: [GraphEntity!]!
    edges: [GraphEdge!]!
    totalCount: Int!
    hasMore: Boolean!
    metadata: GraphMetadata!
  }

  """
  Graph entity (node)
  """
  type GraphEntity {
    id: ID!
    type: EntityType!
    label: String!
    properties: EntityProperties!
    riskScore: Float
    criticality: String
    tags: [String!]
    metadata: JSON
  }

  """
  Entity properties
  """
  type EntityProperties {
    name: String
    value: String
    owner: String
    environment: String
    status: String
    lastSeen: String
    createdAt: String
    customFields: JSON
  }

  """
  Graph edge (relationship)
  """
  type GraphEdge {
    id: ID!
    source: ID!
    target: ID!
    type: String!
    label: String!
    bidirectional: Boolean!
    strength: Float
    metadata: JSON
  }

  """
  Graph metadata
  """
  type GraphMetadata {
    totalNodes: Int!
    totalEdges: Int!
    depth: Int!
    executionTime: Float!
    permissionContext: PermissionContext!
  }

  """
  Permission context
  """
  type PermissionContext {
    userId: ID!
    tenant: String!
    allowedTypes: [EntityType!]!
    restrictedNodes: [ID!]!
  }

  """
  Attack path
  """
  type AttackPath {
    id: ID!
    path: [GraphEntity!]!
    edges: [GraphEdge!]!
    riskScore: Float!
    attackVector: String
    description: String
    mitigations: [String!]
  }

  """
  Ownership context
  """
  type OwnershipContext {
    entity: GraphEntity!
    owner: Owner
    team: Team
    responsible: [User!]
    handoffLink: String
    escalationPath: [Contact!]
  }

  """
  Owner information
  """
  type Owner {
    id: ID!
    name: String!
    email: String
    slackHandle: String
  }

  """
  Team information
  """
  type Team {
    id: ID!
    name: String!
    members: [User!]!
    oncall: User
  }

  """
  User information
  """
  type User {
    id: ID!
    name: String!
    email: String
    role: String
  }

  """
  Contact information
  """
  type Contact {
    name: String!
    role: String!
    email: String
    phone: String
    priority: Int!
  }

  """
  Graph search result
  """
  type GraphSearchResult {
    entities: [GraphEntity!]!
    totalCount: Int!
    hasMore: Boolean!
    query: String!
  }

  """
  Export result
  """
  type ExportResult {
    success: Boolean!
    exportId: ID!
    format: ExportFormat!
    url: String
    sizeBytes: Int
    expiresAt: String
  }

  scalar JSON
`;

const resolvers = {
  Query: {
    entityGraph: async (_, args, context) => {
      const { entityId, entityType, depth, limit, offset, filters } = args;
      const { user, dataSources } = context;

      // Check permissions
      const hasPermission = await dataSources.rbac.checkEntityAccess(
        user.id,
        user.tenant,
        entityId,
        entityType
      );

      if (!hasPermission) {
        throw new Error('Unauthorized: Cannot access this entity');
      }

      // Query Neo4j for graph
      const startTime = Date.now();

      const graph = await dataSources.neo4j.getEntityGraph({
        entityId,
        entityType,
        depth,
        limit,
        offset,
        filters,
        userId: user.id,
        tenant: user.tenant
      });

      const executionTime = (Date.now() - startTime) / 1000;

      return {
        ...graph,
        metadata: {
          ...graph.metadata,
          executionTime,
          permissionContext: {
            userId: user.id,
            tenant: user.tenant,
            allowedTypes: graph.allowedTypes,
            restrictedNodes: graph.restrictedNodes
          }
        }
      };
    },

    attackPaths: async (_, args, context) => {
      const { sourceId, targetId, maxDepth, limit } = args;
      const { user, dataSources } = context;

      // Check permissions for both source and target
      const [sourceAccess, targetAccess] = await Promise.all([
        dataSources.rbac.checkEntityAccess(user.id, user.tenant, sourceId),
        dataSources.rbac.checkEntityAccess(user.id, user.tenant, targetId)
      ]);

      if (!sourceAccess || !targetAccess) {
        throw new Error('Unauthorized: Cannot access source or target entity');
      }

      // Find attack paths using Neo4j
      const paths = await dataSources.neo4j.findAttackPaths({
        sourceId,
        targetId,
        maxDepth,
        limit,
        tenant: user.tenant
      });

      return paths;
    },

    entityOwnership: async (_, args, context) => {
      const { entityId, entityType } = args;
      const { user, dataSources } = context;

      // Check permissions
      const hasPermission = await dataSources.rbac.checkEntityAccess(
        user.id,
        user.tenant,
        entityId,
        entityType
      );

      if (!hasPermission) {
        throw new Error('Unauthorized: Cannot access this entity');
      }

      // Get ownership context
      const ownership = await dataSources.neo4j.getOwnershipContext({
        entityId,
        entityType,
        tenant: user.tenant
      });

      return ownership;
    },

    searchGraph: async (_, args, context) => {
      const { query, entityTypes, limit, offset } = args;
      const { user, dataSources } = context;

      // Search with permission filtering
      const results = await dataSources.neo4j.searchGraph({
        query,
        entityTypes,
        limit,
        offset,
        userId: user.id,
        tenant: user.tenant
      });

      return results;
    }
  },

  Mutation: {
    exportGraph: async (_, args, context) => {
      const { entityId, format, layout } = args;
      const { user, dataSources } = context;

      // Check permissions
      const hasPermission = await dataSources.rbac.checkEntityAccess(
        user.id,
        user.tenant,
        entityId
      );

      if (!hasPermission) {
        throw new Error('Unauthorized: Cannot export this graph');
      }

      // Generate export
      const exportResult = await dataSources.graphExport.generate({
        entityId,
        format,
        layout: layout || 'FORCE_DIRECTED',
        userId: user.id,
        tenant: user.tenant
      });

      return exportResult;
    }
  }
};

module.exports = { typeDefs, resolvers };
