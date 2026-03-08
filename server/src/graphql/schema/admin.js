"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminTypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.adminTypeDefs = (0, graphql_tag_1.gql) `
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
exports.default = { adminTypeDefs: exports.adminTypeDefs };
