import { gql } from 'apollo-server-express';
import wargameSchema from './wargame-schema'; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY

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
export const typeDefs = [baseSchema, wargameSchema]; // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
export default typeDefs;
