const gql = require('graphql-tag');

const typeDefs = gql`
  extend type Entity { id: ID!, label: String!, type: String!, tags: [String!]! }

  enum GraphExportFormat {
    GRAPHML
    GEXF
  }

  input GraphExportFilterInput {
    nodeTypes: [String!]
    relationshipTypes: [String!]
    minConfidence: Float
    minWeight: Float
    maxNodes: Int
    maxEdges: Int
  }

  type GraphExportResult {
    exportId: ID!
    format: GraphExportFormat!
    filename: String!
    contentType: String!
    size: Int!
    downloadUrl: String!
    expiresAt: DateTime!
    filtersApplied: JSON
  }

  extend type Mutation {
    # Expands neighbors around a given entity with role-based limits
    expandNeighbors(entityId: ID!, limit: Int): Graph

    # Expands neighborhood for an entity within an investigation
    expandNeighborhood(entityId: ID!, investigationId: ID!, radius: Int!): Graph

    # Tags an entity with a given string
    tagEntity(entityId: ID!, tag: String!): Entity!

    # Deletes a tag from an entity
    deleteTag(entityId: ID!, tag: String!): Entity!

    # Enqueues a request for AI to analyze an entity
    requestAIAnalysis(entityId: ID!): AIRequestResult!

    # Streams a subgraph export compatible with external visualization tools
    exportInvestigationGraph(
      investigationId: ID
      tenantId: ID
      format: GraphExportFormat!
      filters: GraphExportFilterInput
    ): GraphExportResult!
  }

  type AIRequestResult {
    ok: Boolean!
    requestId: ID
  }
`;

module.exports = { graphTypeDefs: typeDefs };

