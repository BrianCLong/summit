import { gql } from 'graphql-tag';

export const ingestionTypeDefs = gql`
  type IngestionResult {
    tenantId: String!
    ids: [String!]!
    status: String!
  }

  extend type Subscription {
    evidenceIngested(tenantId: String!): IngestionResult
  }
`;
