const gql = require('graphql-tag');

const typeDefs = gql`
  extend type Entity { id: ID!, label: String!, type: String!, tags: [String!]! }

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

    # Exports graph query results as CSV or JSON
    exportGraphData(input: GraphExportInput!): GraphExportPayload!
  }

  type AIRequestResult {
    ok: Boolean!
    requestId: ID
  }

  enum GraphExportFormat {
    CSV
    JSON
  }

  enum GraphDataSource {
    NEO4J
    POSTGRES
  }

  input GraphExportInput {
    query: String!
    parameters: JSON
    format: GraphExportFormat!
    dataSource: GraphDataSource = NEO4J
  }

  type GraphExportPayload {
    filename: String!
    contentType: String!
    content: String!
    contentEncoding: String!
    recordCount: Int!
  }
`;

module.exports = { graphTypeDefs: typeDefs };

