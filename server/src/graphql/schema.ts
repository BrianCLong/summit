import { gql } from 'apollo-server';

export const typeDefs = gql`
  scalar DateTime

  """Coherence signal as stored in graph."""
  type Signal { id: ID!, type: String!, value: Float!, weight: Float, source: String!, ts: DateTime! }

  """Aggregate coherence score per tenant."""
  type CoherenceScore { tenantId: ID!, score: Float!, status: String!, updatedAt: DateTime! }

  input PublishCoherenceSignalInput { tenantId: ID!, type: String!, value: Float!, weight: Float, source: String!, ts: DateTime }

  type Query { tenantCoherence(tenantId: ID!): CoherenceScore! }

  type Mutation { publishCoherenceSignal(input: PublishCoherenceSignalInput!): Boolean! }

  type Subscription { coherenceEvents(tenantId: ID!): Signal! }
`;
