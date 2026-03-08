"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.erTypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.erTypeDefs = (0, graphql_tag_1.gql) `
  type MergeRollbackResult {
    success: Boolean!
    snapshotId: ID!
    decisionId: ID!
  }

  extend type Mutation {
    rollbackMergeSnapshot(mergeId: String!, reason: String!): MergeRollbackResult!
  }
`;
