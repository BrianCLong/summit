import { gql } from 'apollo-server-express';

// Base Schema with core types
const baseSchema = gql`
  scalar JSON
  scalar Upload
  scalar DateTime
  scalar Date
  
  type Query {
    health: HealthStatus!
  }
  
  type Mutation {
    _empty: String
  }
  
  type Subscription {
    _empty: String
  }
  
  type HealthStatus {
    status: String!
    timestamp: DateTime!
    version: String!
    environment: String!
    services: [ServiceHealth!]!
  }
  
  type ServiceHealth {
    name: String!
    status: String!
    details: JSON
  }
`;

// Export unified schema
export const typeDefs = [baseSchema];
export default typeDefs;
