import { gql } from 'graphql-tag';

export const graphMetricsTypeDefs = gql`
  """
  Input for executing a custom graph metric. Cypher must be read-only.
  """
  input CustomGraphMetricInput {
    key: String!
    description: String
    cypher: String!
    parameters: JSON
    ttlSeconds: Int
  }

  """
  Request envelope for executing one or more metrics.
  """
  input CustomGraphMetricRequest {
    tenantId: String
    investigationId: ID
    metrics: [CustomGraphMetricInput!]!
    useCache: Boolean = true
  }

  """
  Response wrapper for a computed metric.
  """
  type CustomGraphMetricResult {
    key: String!
    description: String
    data: JSON!
    cached: Boolean!
    executedAt: DateTime!
  }

  """
  Built-in Cypher templates that can be reused for graph analytics.
  """
  type GraphMetricTemplate {
    key: String!
    name: String!
    description: String!
    cypher: String!
    defaultParameters: JSON
    recommendedTtlSeconds: Int!
  }

  extend type Query {
    customGraphMetrics(input: CustomGraphMetricRequest!): [CustomGraphMetricResult!]!
    customGraphMetricTemplates: [GraphMetricTemplate!]!
  }
`;

export default graphMetricsTypeDefs;
