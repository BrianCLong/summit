import { gql } from 'apollo-server';
import { ledgerStore, verifyManifest } from './manifest';
import { Manifest as ManifestType } from './types';

export const typeDefs = gql`
  type Evidence { id: ID!, hash: String!, metadata: String, licenses: [String!], lineage: JSON }
  type Claim { id: ID!, evidenceIds: [ID!]!, statement: String! }
  type Manifest {
    id: ID!
    claimId: ID!
    merkleRoot: String!
    createdAt: String!
    evidenceHashes: [String!]!
    licenses: [String!]!
    lineage: JSON!
  }
  scalar JSON
  type VerificationResult { valid: Boolean!, expectedRoot: String!, manifestRoot: String! }
  type Query { _health: String!, manifest(id: ID!): Manifest }
  type Mutation {
    registerEvidence(hash: String!, metadata: String, licenses: [String!], lineage: JSON): Evidence!
    createClaim(evidenceIds: [ID!]!, statement: String!): Claim!
    sealManifest(claimId: ID!): Manifest!
    verifyManifest(manifestId: ID!): VerificationResult!
  }
`;

function parseMetadata(metadata?: string) {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch (err) {
    return { note: metadata };
  }
}

export const resolvers = {
  Query: {
    _health: () => 'ok',
    manifest: (_: unknown, { id }: { id: string }): ManifestType | null => ledgerStore.getManifest(id) ?? null
  },
  Mutation: {
    registerEvidence: (
      _: unknown,
      { hash, metadata, licenses, lineage }: { hash: string; metadata?: string; licenses?: string[]; lineage?: Record<string, string> }
    ) => ledgerStore.registerEvidence(hash, parseMetadata(metadata), licenses ?? [], lineage ?? {}),
    createClaim: (_: unknown, { evidenceIds, statement }: { evidenceIds: string[]; statement: string }) =>
      ledgerStore.createClaim(evidenceIds, statement),
    sealManifest: (_: unknown, { claimId }: { claimId: string }) => ledgerStore.sealManifest(claimId),
    verifyManifest: (_: unknown, { manifestId }: { manifestId: string }) => {
      const manifest = ledgerStore.getManifest(manifestId);
      if (!manifest) {
        throw new Error('Manifest not found');
      }
      return verifyManifest(manifest, manifest.evidenceHashes);
    }
  }
};
