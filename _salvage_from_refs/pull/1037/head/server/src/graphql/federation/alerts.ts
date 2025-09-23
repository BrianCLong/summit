import gql from 'graphql-tag';
import { alertsResolvers } from '../../resolvers/alerts.js';

export const typeDefs = gql`
  type Alert @key(fields: "id") {
    id: ID!
    level: String!
    message: String!
  }

  extend type Query {
    alerts: [Alert!]!
  }
`;

export const resolvers = alertsResolvers;
