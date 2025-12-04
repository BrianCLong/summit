import { gql } from 'graphql-tag';

export const adminTypeDefs = gql`
  type PersistedQuery {
    id: ID!
    sha256: String!
    query: String!
    createdBy: String
    createdAt: DateTime!
    tenantId: String
  }

  input PersistedQueryInput {
    query: String!
    sha256: String
    tenantId: String
  }

  extend type Query {
    listPersistedQueries(tenantId: String): [PersistedQuery!]!
  }

  extend type Mutation {
    upsertPersistedQuery(input: PersistedQueryInput!): ID!
    deletePersistedQuery(id: ID!): Boolean!
  }
`;

export default { adminTypeDefs };
