import { gql } from 'graphql-tag';

export const featureTourTypeDefs = gql`
  type FeatureTourProgress {
    id: ID!
    userId: ID!
    tourKey: String!
    completed: Boolean!
    completedAt: DateTime
    lastStep: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input FeatureTourProgressInput {
    tourKey: String!
    completed: Boolean
    lastStep: Int
  }

  extend type Query {
    featureTourProgress(tourKey: String!): FeatureTourProgress
    featureTourProgresses: [FeatureTourProgress!]!
  }

  extend type Mutation {
    recordFeatureTourProgress(input: FeatureTourProgressInput!): FeatureTourProgress!
  }
`;

export default featureTourTypeDefs;
