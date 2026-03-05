// @ts-nocheck
import { gql } from 'apollo-server';
import { addEvidence, addClaim, exportManifest } from './ledger';

export const typeDefs = gql`
  type Evidence { id: ID!, sha256: String!, contentType: String!, createdAt: String! }
  type Claim { id: ID!, hashRoot: String!, transformChain: [String!]! }
  type Manifest { data: String! }

  type Query {
    _health: String!
    getManifest(caseId: String!): Manifest!
  }

  type Mutation {
    registerEvidence(sha256: String!, contentType: String!): Evidence!
    registerClaim(evidenceIds: [ID!]!, transformChain: [String!]!): Claim!
  }
`;

export const resolvers = {
  Query: {
    _health: () => 'ok',
    getManifest: async (_: any, { caseId }: any) => {
      const data = await exportManifest(caseId);
      return { data };
    }
  },
  Mutation: {
    registerEvidence: async (_: any, { sha256, contentType }: any) => {
      return await addEvidence(sha256, contentType);
    },
    registerClaim: async (_: any, { evidenceIds, transformChain }: any) => {
      return await addClaim(evidenceIds, transformChain);
    }
  }
};
