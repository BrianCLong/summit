import { gql } from 'graphql-tag';
import { typeDefs as moduleTypeDefs, resolvers as moduleResolvers } from './modules/index.js';

const base = gql`
  scalar JSON
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
  type Subscription {
    _empty: String
  }
`;

export const typeDefs = [base, ...moduleTypeDefs];
export default moduleResolvers;
