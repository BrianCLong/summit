import { typeDefs as coreTypeDefs } from './schema.core.js'; // Assuming this exports typeDefs
import { canonicalTypeDefs } from './schema.canonical.js';
import { gql } from 'graphql-tag';

// Combine all typeDefs
export const typeDefs = [
  coreTypeDefs,
  canonicalTypeDefs,
  // Add other schemas here...
  gql`
    type Query {
        _empty: String
    }
    type Mutation {
        _empty: String
    }
    type Subscription {
        _empty: String
    }
  `
];
