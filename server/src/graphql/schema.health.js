const { gql } = require('graphql-tag');

const healthTypeDefs = gql`
  type CiSignal {
    status: String!
    score: Int!
  }

  type P95Latency {
    value: Int!
    score: Int!
  }

  type GraphConsistency {
    consistency: Float!
    score: Int!
  }

  type ErrorTaxonomies {
    critical: Int!
    error: Int!
    warning: Int!
    score: Int!
  }

  type SecretDrift {
    drift: Float!
    score: Int!
  }

  type PredictiveAnomalyDetection {
    anomalies: Int!
    score: Int!
  }

  type HealthScore {
    healthScore: Float!
    ciSignal: CiSignal!
    p95Latency: P95Latency!
    graphConsistency: GraphConsistency!
    errorTaxonomies: ErrorTaxonomies!
    secretDrift: SecretDrift!
    predictiveAnomalyDetection: PredictiveAnomalyDetection!
  }

  extend type Query {
    healthScore: HealthScore!
  }
`;

module.exports = { healthTypeDefs };
