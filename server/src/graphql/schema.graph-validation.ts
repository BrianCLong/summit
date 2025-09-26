import { gql } from 'graphql-tag';

export const graphValidationTypeDefs = gql`
  input GraphNodeInput {
    id: ID!
    labels: [String!]!
    properties: JSON!
  }

  input GraphRelationshipInput {
    id: ID
    type: String!
    sourceId: ID!
    targetId: ID!
    properties: JSON
  }

  input GraphValidationInput {
    tenantId: ID!
    nodes: [GraphNodeInput!]!
    relationships: [GraphRelationshipInput!]!
  }

  type GraphValidationError {
    path: String!
    message: String!
    code: String!
    rule: String
    severity: String!
  }

  type GraphValidationResult {
    valid: Boolean!
    errors: [GraphValidationError!]!
    warnings: [String!]!
    appliedRules: [String!]!
  }

  extend type Mutation {
    validateGraphData(input: GraphValidationInput!): GraphValidationResult!
  }
`;

export default graphValidationTypeDefs;
