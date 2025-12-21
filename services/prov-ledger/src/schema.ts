import { gql } from 'apollo-server';
import { ledger } from './services/ledger';
import { Claim, Evidence, Manifest } from './types';

export const typeDefs = gql`
  type EvidenceMeta {
    licenseTags: [String!]!
    lineage: [Lineage!]!
  }

  type Lineage {
    field: String!
    source: String!
  }

  type Evidence {
    id: ID!
    hash: String!
    metadata: EvidenceMeta!
  }

  type Claim {
    id: ID!
    evidenceIds: [ID!]!
    statement: String!
  }

  type Manifest {
    id: ID!
    merkleRoot: String!
    createdAt: String!
    licenseTags: [String!]!
    lineage: [Lineage!]!
  }

  type Query {
    _health: String!
    claim(id: ID!): Claim
    manifest(id: ID!): Manifest
  }

  input EvidenceMetaInput {
    licenseTags: [String!]
    lineage: [LineageInput!]
  }

  input LineageInput {
    field: String!
    source: String!
  }

  type Mutation {
    registerEvidence(hash: String!, metadata: EvidenceMetaInput): Evidence!
    registerClaim(evidenceIds: [ID!]!, statement: String!): Claim!
    sealManifest(claimId: ID!): Manifest!
  }
`;

export const resolvers = {
  Query: {
    _health: () => 'ok',
    claim: (_: unknown, { id }: { id: string }): Claim | null => ledger.getClaim(id) ?? null,
    manifest: (_: unknown, { id }: { id: string }): Manifest | null => ledger.getManifest(id) ?? null
  },
  Mutation: {
    registerEvidence: (_: unknown, { hash, metadata }: { hash: string; metadata?: Evidence['metadata'] }): Evidence =>
      ledger.registerEvidence(hash, metadata),
    registerClaim: (
      _: unknown,
      { evidenceIds, statement }: { evidenceIds: string[]; statement: string }
    ): Claim => ledger.registerClaim(evidenceIds, statement),
    sealManifest: (_: unknown, { claimId }: { claimId: string }): Manifest => ledger.sealManifest(claimId)
  },
  Evidence: {
    metadata: (evidence: Evidence) => evidence.metadata
  },
  Manifest: {
    licenseTags: (manifest: Manifest) => manifest.licenseTags,
    lineage: (manifest: Manifest) => manifest.lineage
  }
};
