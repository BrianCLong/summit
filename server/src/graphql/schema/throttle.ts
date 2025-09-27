import { gql } from 'graphql-tag';

export const throttleTypeDefs = gql`
  type GraphQLConcurrencyStatus {
    userId: ID!
    limit: Int!
    active: Int!
    hasCustomLimit: Boolean!
    defaultLimit: Int!
  }

  type GraphQLConcurrencyDefaults {
    defaultLimit: Int!
  }

  extend type Query {
    graphqlConcurrencyStatus(userId: ID!): GraphQLConcurrencyStatus!
    graphqlConcurrencyDefaults: GraphQLConcurrencyDefaults!
  }

  extend type Mutation {
    setGraphQLConcurrencyLimit(userId: ID!, limit: Int!): GraphQLConcurrencyStatus!
    clearGraphQLConcurrencyLimit(userId: ID!): GraphQLConcurrencyStatus!
    setGraphQLConcurrencyDefault(limit: Int!): GraphQLConcurrencyDefaults!
  }
`;

export default throttleTypeDefs;
