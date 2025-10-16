import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar JSON
  scalar DateTime

  """
  Core entity in the IntelGraph knowledge base
  """
  type Entity {
    id: ID!
    type: String!
    name: String!
    attributes: JSON
    sources: [Source!]!
    degree: Int!
    """
    Confidence score for entity resolution (0.0 - 1.0)
    """
    confidence: Float
    """
    Creation timestamp
    """
    createdAt: DateTime!
    """
    Last update timestamp
    """
    updatedAt: DateTime!
    """
    Data retention tier
    """
    retentionTier: String!
    """
    Purpose classification for data usage
    """
    purpose: String!
    """
    Data residency region
    """
    region: String!
  }

  """
  Threat intelligence indicator
  """
  type Indicator {
    id: ID!
    iocType: String!
    value: String!
    confidence: Float
    sources: [Source!]!
    """
    Related entities through graph traversal
    """
    relatedEntities: [Entity!]!
    """
    First seen timestamp
    """
    firstSeen: DateTime
    """
    Last seen timestamp
    """
    lastSeen: DateTime
    """
    Tags and classifications
    """
    tags: [String!]!
  }

  """
  Data source provenance information
  """
  type Source {
    id: ID!
    system: String!
    collectedAt: DateTime!
    """
    Provenance metadata including collection method
    """
    provenance: JSON
    """
    Source reliability score
    """
    reliability: Float
  }

  """
  Graph path between entities
  """
  type PathStep {
    from: ID!
    to: ID!
    relType: String!
    """
    Path traversal score/weight
    """
    score: Float
    """
    Edge properties
    """
    properties: JSON
  }

  """
  Graph analytics and insights
  """
  type GraphInsight {
    type: String!
    """
    Insight relevance score
    """
    score: Float!
    """
    Related entities
    """
    entities: [Entity!]!
    """
    Insight description
    """
    description: String
    """
    Supporting evidence
    """
    evidence: [JSON!]!
  }

  """
  Entity search filters
  """
  input EntityFilter {
    types: [String!]
    purposes: [String!]
    regions: [String!]
    sources: [String!]
    retentionTiers: [String!]
    """
    Date range filter
    """
    dateRange: DateRangeInput
    """
    Confidence threshold (0.0 - 1.0)
    """
    minConfidence: Float
  }

  """
  Date range input
  """
  input DateRangeInput {
    from: DateTime!
    to: DateTime!
  }

  """
  Pagination input
  """
  input PaginationInput {
    limit: Int = 25
    offset: Int = 0
  }

  """
  Entity search results with pagination
  """
  type EntitySearchResult {
    entities: [Entity!]!
    totalCount: Int!
    hasMore: Boolean!
    """
    Next pagination cursor
    """
    nextCursor: String
  }

  """
  Query root type
  """
  type Query {
    """
    Get entity by ID with ABAC policy enforcement
    """
    entityById(id: ID!): Entity

    """
    Search entities with filtering and pagination
    """
    searchEntities(
      query: String!
      filter: EntityFilter
      pagination: PaginationInput
    ): EntitySearchResult!

    """
    Find shortest path between two entities (max 3 hops per SLO)
    """
    pathBetween(fromId: ID!, toId: ID!, maxHops: Int = 3): [PathStep!]!

    """
    Get threat intelligence indicators
    """
    indicators(filter: EntityFilter, pagination: PaginationInput): [Indicator!]!

    """
    Get graph-based insights for entity or set of entities
    """
    insights(entityIds: [ID!]!, insightTypes: [String!]): [GraphInsight!]!

    """
    Entity relationship graph for visualization
    """
    entityGraph(
      centerEntityId: ID!
      depth: Int = 2
      relationTypes: [String!]
    ): EntityGraph!

    """
    Health check for API availability
    """
    health: HealthStatus!
  }

  """
  Entity graph for visualization
  """
  type EntityGraph {
    nodes: [EntityNode!]!
    edges: [EntityEdge!]!
    """
    Graph statistics
    """
    stats: GraphStats!
  }

  """
  Graph node representation
  """
  type EntityNode {
    id: ID!
    label: String!
    type: String!
    """
    Node size/importance score
    """
    weight: Float!
    """
    Visual properties
    """
    properties: JSON
  }

  """
  Graph edge representation
  """
  type EntityEdge {
    id: ID!
    source: ID!
    target: ID!
    type: String!
    """
    Edge weight/strength
    """
    weight: Float!
    """
    Edge properties and metadata
    """
    properties: JSON
  }

  """
  Graph statistics
  """
  type GraphStats {
    nodeCount: Int!
    edgeCount: Int!
    density: Float!
    """
    Average clustering coefficient
    """
    clustering: Float!
  }

  """
  API health status
  """
  type HealthStatus {
    status: String!
    timestamp: DateTime!
    version: String!
    """
    Component health details
    """
    components: JSON!
    """
    Performance metrics
    """
    metrics: JSON!
  }

  """
  Subscription root type for real-time updates
  """
  type Subscription {
    """
    Real-time entity updates
    """
    entityUpdated(entityId: ID!): Entity!

    """
    New insights generated
    """
    insightGenerated(entityIds: [ID!]): GraphInsight!
  }

  # Note: Mutations are intentionally limited for Sprint 0 baseline
  # They will be enabled in subsequent sprints with proper RBAC
`;
