const { gql } = require('graphql-tag');

const analyticsTypeDefs = gql`


  # GraphAnalyticsNode is a lightweight node representation for analytics
  type GraphAnalyticsNode {
    id: ID!
    label: String
    type: String
  }

  type GraphCycle {
    length: Int!
    nodes: [GraphAnalyticsNode!]!
  }

  type GraphClique {
    size: Int!
    nodes: [GraphAnalyticsNode!]!
  }

  type GraphPattern {
    type: String!
    description: String
    nodes: [GraphAnalyticsNode!]!
    metrics: JSON
  }

  extend type Query {

    graphCycles(
      investigationId: ID
      minDepth: Int = 2
      maxDepth: Int = 5
      limit: Int = 10
    ): [GraphCycle!]!

    graphCliques(
      investigationId: ID
      minSize: Int = 3
      limit: Int = 10
    ): [GraphClique!]!

    graphPatterns(
      investigationId: ID
      patternType: String # "star", "chain", "bridge", "hub"
      limit: Int = 10
    ): [GraphPattern!]!
  }
`;

module.exports = { analyticsTypeDefs };
