import { gql } from "graphql-tag";
export const typeDefs = gql`
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
