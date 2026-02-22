// @ts-nocheck
import { gql } from 'apollo-server';

export const typeDefs = gql`
  type Evidence { id: ID!, hash: String!, metadata: String }
  type Claim { id: ID!, evidenceIds: [ID!]!, statement: String! }
  type Manifest { id: ID!, merkleRoot: String!, createdAt: String! }
  type Query { _health: String! }
  type Mutation {
    registerEvidence(hash: String!, metadata: String): Evidence!
    sealManifest(claimId: ID!): Manifest!
  }
`;

export const resolvers = {
  Query: { _health: () => 'ok' },
  Mutation: {
    registerEvidence: (_: any, { hash, metadata }: any) => ({ id: 'e1', hash, metadata: metadata ?? null }),
    sealManifest: (_: any, { claimId }: any) => ({ id: claimId, merkleRoot: '0xdeadbeef', createdAt: new Date().toISOString() })
  }
};
