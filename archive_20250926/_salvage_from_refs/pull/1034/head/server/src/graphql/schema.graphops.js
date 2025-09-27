const { gql } = require('apollo-server-express');

// Graph Ops + AI schema extensions
const graphTypeDefs = gql`
  type Entity { id: ID!, label: String!, type: String!, tags: [String!]! }
  type Edge { id: ID!, source: ID!, target: ID!, type: String!, label: String }
  type ExpandResult { nodes: [Entity!]!, edges: [Edge!]! }

  type AIRequest { ok: Boolean!, requestId: ID! }

  extend type Mutation {
    expandNeighbors(entityId: ID!, limit: Int = 50): ExpandResult!
    tagEntity(entityId: ID!, tag: String!): Entity!
    requestAIAnalysis(entityId: ID!): AIRequest!
  }
`;

module.exports = { graphTypeDefs };

