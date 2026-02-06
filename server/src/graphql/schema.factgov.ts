import { gql } from 'graphql-tag';

export const factGovSchema = gql`
  type Agency {
    id: ID!
    name: String!
    domain: String!
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type Vendor {
    id: ID!
    name: String!
    description: String
    tags: [String!]!
    complianceStatus: String!
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type RFP {
    id: ID!
    agencyId: ID!
    title: String!
    content: String!
    budgetRange: String
    status: String!
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type Match {
    id: ID!
    rfpId: ID!
    vendorId: ID!
    score: Float
    matchDetails: JSON
    createdAt: DateTime!
  }

  extend type Query {
    factgovGetRfp(id: ID!): RFP @scope(requires: "factgov:read")
    factgovGetVendor(id: ID!): Vendor @scope(requires: "factgov:read")
    factgovGetMatches(rfpId: ID!): [Match!]! @scope(requires: "factgov:read")
  }

  extend type Mutation {
    factgovCreateAgency(name: String!, domain: String!): Agency! @scope(requires: "factgov:admin")
    factgovCreateVendor(name: String!, tags: [String!]!, description: String): Vendor! @scope(requires: "factgov:write")
    factgovCreateRfp(agencyId: ID!, title: String!, content: String!): RFP! @scope(requires: "factgov:write")
    factgovMatchRfp(rfpId: ID!): [Match!]! @scope(requires: "factgov:write")
  }
`;
