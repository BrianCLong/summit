import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type FeatureContribution {
    name: String!
    contribution: Float!
  }

  type AnomalyExplanation {
    id: ID!
    score: Float!
    explanation: String!
    features: [FeatureContribution!]!
  }

  type Query {
    explainAnomaly(id: ID!): AnomalyExplanation
  }
`;
