import { gql } from 'apollo-server';
import { ledgerStore } from './store';
import { buildManifestRoot } from './signature';

export const typeDefs = gql`
  type Evidence { id: ID!, hash: String!, metadata: String }
  type Claim { id: ID!, evidenceIds: [ID!]!, statement: String! }
  type Manifest { id: ID!, merkleRoot: String!, createdAt: String!, claimId: ID! }
  type Event { type: String!, timestamp: String!, payload: String! }
  type Query { _health: String!, events: [Event!]! }
  type Mutation {
    registerEvidence(hash: String!, metadata: String): Evidence!
    registerClaim(statement: String!, evidenceIds: [ID!]!): Claim!
    sealManifest(claimId: ID!): Manifest!
  }
`;

function serializePayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

export const resolvers = {
  Query: {
    _health: () => 'ok',
    events: () => ledgerStore.getEvents().map((e) => ({ ...e, payload: serializePayload(e.payload) })),
  },
  Mutation: {
    registerEvidence: (_: unknown, { hash, metadata }: { hash: string; metadata?: string | null }) =>
      ledgerStore.registerEvidence(hash, metadata),
    registerClaim: (
      _: unknown,
      { statement, evidenceIds }: { statement: string; evidenceIds: string[] },
    ) => ledgerStore.registerClaim(statement, evidenceIds),
    sealManifest: (_: unknown, { claimId }: { claimId: string }) => {
      const claim = ledgerStore.getClaim(claimId);
      if (!claim) {
        throw new Error('Claim not found');
      }
      const evidence = ledgerStore.listEvidence(claim.evidenceIds);
      const merkleRoot = buildManifestRoot(claim.id, evidence);
      return ledgerStore.sealManifest(claimId, merkleRoot);
    },
  },
};
