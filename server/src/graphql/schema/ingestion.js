"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionTypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.ingestionTypeDefs = (0, graphql_tag_1.gql) `
  type IngestionResult {
    tenantId: String!
    ids: [String!]!
    status: String!
  }

  extend type Subscription {
    evidenceIngested(tenantId: String!): IngestionResult
  }
`;
