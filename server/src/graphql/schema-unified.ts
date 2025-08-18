import { gql } from 'apollo-server-express';
import { typeDefs as mainSchema } from './schema.js';

// Health check types for monitoring
const healthSchema = gql`
  scalar DateTime
  scalar JSON
  
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
  
  extend type Query {
    health: HealthStatus!
  }
`;

// Combine all schema definitions
export const typeDefs = [healthSchema, ...mainSchema];
export default typeDefs;
