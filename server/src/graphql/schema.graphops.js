const gql = require('graphql-tag');

const typeDefs = gql`
  input GraphBatchNodeInput {
    id: ID!
    tenantId: String!
    type: String!
    label: String!
    investigationId: ID
    tags: [String!]
    properties: JSON
  }

  input GraphBatchEdgeInput {
    id: ID
    tenantId: String!
    type: String!
    label: String
    sourceId: ID!
    targetId: ID!
    investigationId: ID
    properties: JSON
  }

  input GraphBatchNodeDeleteInput {
    id: ID!
    tenantId: String!
  }

  input GraphBatchEdgeDeleteInput {
    id: ID!
    tenantId: String!
  }

  input GraphBatchInput {
    createNodes: [GraphBatchNodeInput!]
    createEdges: [GraphBatchEdgeInput!]
    deleteNodes: [GraphBatchNodeDeleteInput!]
    deleteEdges: [GraphBatchEdgeDeleteInput!]
  }

  type GraphBatchResult {
    nodesCreated: Int!
    nodesUpdated: Int!
    edgesCreated: Int!
    edgesUpdated: Int!
    nodesDeleted: Int!
    edgesDeleted: Int!
  }

  extend type Entity {
    id: ID!
    label: String!
    type: String!
    tags: [String!]!
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

    # Applies a batch of graph mutations (create/delete) in a single transaction
    batchGraphUpdate(input: GraphBatchInput!): GraphBatchResult!
  }

  type AIRequestResult {
    ok: Boolean!
    requestId: ID
  }
`;

module.exports = { graphTypeDefs: typeDefs };
