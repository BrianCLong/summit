import { gql } from 'graphql-tag';

export const provenanceServiceTypeDefs = gql`
  # -- Inputs --
  input RegisterEvidenceInput {
    evidence_hash: String!
    evidence_type: String!
    storage_uri: String!
    source_id: String!
    transform_chain: [String!]
    license_id: String!
    classification_level: String
    content_preview: String
  }

  input RegisterClaimInput {
    content: String!
    claim_type: String!
    confidence: Float!
    evidence_ids: [String!]
    source_id: String!
    transform_chain: [String!]
    license_id: String!
    investigation_id: String
  }

  input LinkClaimEvidenceInput {
    claim_id: String!
    evidence_id: String!
    relation_type: String! # SUPPORTS | CONTRADICTS
    confidence: Float
    notes: String
  }

  input CreateExportManifestInput {
    claim_ids: [String!]!
    export_type: String!
    classification_level: String!
    authority_basis: [String!]
  }

  # -- Types --
  type EvidenceArtifact {
    id: ID!
    sha256: String!
    artifact_type: String!
    storage_uri: String!
    classification_level: String!
    created_at: DateTime!
  }

  type Claim {
    id: ID!
    content: String!
    confidence: Float!
    claim_type: String!
    created_at: DateTime!
  }

  type ClaimEvidenceLink {
    id: ID!
    claim_id: String!
    evidence_id: String!
    relation_type: String!
    confidence: Float
  }

  type ExportManifest {
    id: ID!
    bundle_id: String!
    merkle_root: String!
    created_at: DateTime!
  }

  # -- Mutations --
  extend type Mutation {
    registerEvidence(input: RegisterEvidenceInput!): EvidenceArtifact
    registerClaim(input: RegisterClaimInput!): Claim
    linkClaimToEvidence(input: LinkClaimEvidenceInput!): ClaimEvidenceLink
    createExportManifest(input: CreateExportManifestInput!): ExportManifest
  }
`;
