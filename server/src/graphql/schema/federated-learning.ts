import { gql } from 'graphql-tag';

export const federatedLearningTypeDefs = gql`
  type FederatedTrainingMetrics {
    roundsCompleted: Int!
    trainingLossHistory: [Float!]!
    globalMetrics: JSON!
    clientExampleCounts: JSON!
    timestamp: Float!
    modelPath: String!
  }

  type FederatedTrainingJob {
    jobId: ID!
    status: String!
    startedAt: DateTime!
    completedAt: DateTime
    metrics: FederatedTrainingMetrics
    error: String
  }

  input FederatedClientExampleInput {
    features: JSON!
    label: Float!
    weight: Float
  }

  input FederatedClientInput {
    tenantId: ID!
    examples: [FederatedClientExampleInput!]!
  }

  input FederatedTrainingInput {
    clients: [FederatedClientInput!]!
    rounds: Int
    batchSize: Int
    learningRate: Float
    modelType: String
  }

  extend type Mutation {
    startFederatedTraining(input: FederatedTrainingInput!): FederatedTrainingJob!
  }

  extend type Query {
    federatedTrainingJob(jobId: ID!): FederatedTrainingJob
  }
`;

export default federatedLearningTypeDefs;
