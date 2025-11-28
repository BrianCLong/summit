import { gql } from 'graphql-tag';

export const entitiesTypeDefs = gql`
  type Query {
    entityById(id: ID!, tenant: ID!): Entity!
    searchEntities(q: String!, limit: Int = 25, tenant: ID!): [Entity!]!
    neighbors(id: ID!, hops: Int = 2, filter: NeighborFilter, tenant: ID!): [Entity!]!
  }

  interface Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
  }

  type Person implements Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
    name: String!
    email: String @pii
  }

  type Org implements Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
    name: String!
  }

  type Asset implements Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
    type: String!
    value: String!
  }

  type Event implements Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
    description: String!
    timestamp: String!
  }

  type Indicator implements Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
    pattern: String!
  }

  input NeighborFilter {
    labelIn: [String!]
    edgeIn: [String!]
    maxDegree: Int
  }

  directive @pii on FIELD_DEFINITION
`;
