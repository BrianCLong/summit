"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collabTypeDefs = void 0;
// Mock for graphql/schema.collab
exports.collabTypeDefs = `
  type Branch {
    id: ID!
    name: String!
    createdAt: String
  }

  type Mutation {
    createBranch(name: String!): Branch
    deleteBranch(id: ID!): Boolean
  }

  type Query {
    branch(id: ID!): Branch
    branches: [Branch!]!
  }
`;
exports.default = exports.collabTypeDefs;
