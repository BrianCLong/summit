import { gql } from 'graphql-tag';

export const uiExperimentsTypeDefs = gql`
  type UIExperimentVariation {
    name: String!
    weight: Float!
    config: JSON!
  }

  type UIExperiment {
    id: ID!
    tenantId: String!
    featureKey: String!
    description: String
    isActive: Boolean!
    variations: [UIExperimentVariation!]!
    updatedAt: DateTime!
  }

  extend type Query {
    uiExperiments(featureKeys: [String!], onlyActive: Boolean = true): [UIExperiment!]!
  }
`;

export default uiExperimentsTypeDefs;
