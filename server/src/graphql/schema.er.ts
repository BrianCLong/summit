import { gql } from 'graphql-tag';

export const erTypeDefs = gql`
  type MergeRollbackResult {
    success: Boolean!
    snapshotId: ID!
    decisionId: ID!
  }

  extend type Mutation {
    rollbackMergeSnapshot(mergeId: String!, reason: String!): MergeRollbackResult!
  }
`;
