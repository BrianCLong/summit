"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.typeDefs = (0, graphql_tag_1.gql) `
  type Person {
    id: ID!
    tenantId: ID!
    name: String!
    email: String
    orgs(limit: Int = 10): [OrganizationEdge!]!
  }
  type Organization {
    id: ID!
    tenantId: ID!
    name: String!
    domain: String
  }
  type OrganizationEdge {
    org: Organization!
    since: String
    until: String
    provenance: String
  }
  type IngestResult {
    batchId: ID!
    accepted: Int!
    rejected: Int!
    manifestHash: String!
  }
  type Query {
    personById(id: ID!): Person
    searchPersons(q: String!, limit: Int = 20): [Person!]!
    neighbors(personId: ID!, hop: Int = 1, limit: Int = 50): [Person!]!
  }
  type Mutation {
    ingestBatch(s3Url: String!, mappingId: ID!): IngestResult!
  }
`;
