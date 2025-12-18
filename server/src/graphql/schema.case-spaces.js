// server/src/graphql/schema.case-spaces.js
import { gql } from 'graphql-tag';

export const caseSpacesTypeDefs = gql`
  scalar DateTime
  scalar JSON

  type CaseSpace {
    id: ID!
    name: String!
    description: String
    status: String!
    priority: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    closedAt: DateTime
    slaStartTime: DateTime
    slaEndTime: DateTime
    auditLog: [CaseSpaceAuditEntry!]!
  }

  type CaseSpaceAuditEntry {
    id: ID!
    caseSpaceId: ID!
    actorId: ID
    action: String!
    details: JSON
    timestamp: DateTime!
  }

  input CaseSpaceInput {
    name: String!
    description: String
    status: String
    priority: String
    slaStartTime: DateTime
    slaEndTime: DateTime
  }

  input CaseSpaceUpdateInput {
    id: ID!
    name: String
    description: String
    status: String
    priority: String
    slaStartTime: DateTime
    slaEndTime: DateTime
  }

  extend type Query {
    caseSpace(id: ID!): CaseSpace
    caseSpaces(status: String, priority: String, limit: Int = 50, offset: Int = 0): [CaseSpace!]!
  }

  extend type Mutation {
    createCaseSpace(input: CaseSpaceInput!): CaseSpace!
    updateCaseSpace(input: CaseSpaceUpdateInput!): CaseSpace
    deleteCaseSpace(id: ID!): Boolean!
  }
`;
