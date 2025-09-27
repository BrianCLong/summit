import gql from 'graphql-tag';
import { entityResolvers } from '../../resolvers/entities.js';

export const typeDefs = gql`
  type Entity @key(fields: "id") {
    id: ID!
    type: String!
    props: JSON
    createdAt: DateTime!
    updatedAt: DateTime
  }

  extend type Query {
    entity(id: ID!): Entity
    entities(type: String, q: String, limit: Int!, offset: Int!): [Entity!]!
  }

  extend type Mutation {
    createEntity(id: ID!, type: String!, props: JSON): Entity
  }
`;

export const resolvers = entityResolvers;
