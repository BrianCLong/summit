import gql from 'graphql-tag';
import { insightsResolvers } from '../../resolvers/insights.js';

export const typeDefs = gql`
  type Insight @key(fields: "id") {
    id: ID!
    message: String!
  }

  extend type Query {
    insights: [Insight!]!
  }
`;

export const resolvers = insightsResolvers;
