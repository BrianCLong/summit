import { gql } from 'graphql-tag';

export const mlStreamingTypeDefs = gql`
  type MLStreamingPrediction {
    modelId: String!
    inferenceId: ID!
    inputId: String
    predictions: JSON!
    metadata: JSON
    receivedAt: DateTime!
    latencyMs: Float!
  }

  type MLStreamingStatus {
    modelId: String!
    connected: Boolean!
    lastHeartbeatAt: DateTime
    averageLatencyMs: Float
  }

  extend type Query {
    mlStreamingStatus(modelId: String!): MLStreamingStatus!
  }

  extend type Subscription {
    mlInferenceStream(modelId: String!): MLStreamingPrediction!
  }
`;

export default mlStreamingTypeDefs;
