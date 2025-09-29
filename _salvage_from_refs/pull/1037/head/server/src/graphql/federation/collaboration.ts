import gql from 'graphql-tag';
import { collaborationResolvers } from '../../resolvers/collaboration.js';

export const typeDefs = gql`
  type Investigation @key(fields: "id") {
    id: ID!
    title: String!
    description: String
  }

  extend type Query {
    investigations(limit: Int, offset: Int): [Investigation!]!
    investigation(id: ID!): Investigation
  }

  extend type Mutation {
    createInvestigation(title: String!, description: String): Investigation
  }
`;

export const resolvers = collaborationResolvers;
