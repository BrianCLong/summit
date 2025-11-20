/**
 * GraphQL Schema for Provenance Ledger Beta
 * Extends existing provenance schema with Source, Transform, and enhanced types
 */

import { gql } from 'graphql-tag';

export const provenanceBetaTypeDefs = gql`
  # ============================================================================
  # ENUMS
  # ============================================================================

  enum LicenseType {
    public
    internal
    restricted
    classified
  }

  enum SourceType {
    document
    database
    api
    user_input
    sensor
  }

  enum TransformType {
    extract
    ocr
    translate
    normalize
    enrich
    extract_claim
    deduplicate
    classify
    redact
  }

  enum EvidenceType {
    document
    image
    video
    log
    testimony
    sensor_data
    database_record
  }

  enum ClaimType {
    factual
    inferential
    predictive
    evaluative
  }

  enum ManifestItemType {
    claim
    evidence
    source
    transform
  }

  # ============================================================================
  # TYPES
  # ============================================================================

  type License {
    id: ID!
    license_type: LicenseType!
    license_terms: String
    restrictions: [String!]!
    attribution_required: Boolean!
    expiration_date: DateTime
    metadata: JSON
    created_at: DateTime!
    updated_at: DateTime!
  }

  type Source {
    id: ID!
    source_hash: String!
    source_type: SourceType!
    origin_url: String
    ingestion_timestamp: DateTime!
    metadata: JSON!
    license: License!
    custody_chain: [String!]!
    retention_policy: String!
    created_by: String!
    created_at: DateTime!
  }

  type Transform {
    id: ID!
    transform_type: TransformType!
    input_hash: String!
    output_hash: String!
    algorithm: String!
    version: String!
    parameters: JSON!
    execution_timestamp: DateTime!
    duration_ms: Int!
    executed_by: String!
    confidence: Float
    parent_transforms: [Transform!]!
    metadata: JSON
    created_at: DateTime!
  }

  type Evidence {
    id: ID!
    evidence_hash: String!
    evidence_type: EvidenceType!
    content_preview: String
    storage_uri: String!
    source: Source!
    transform_chain: [Transform!]!
    license: License!
    classification_level: String!
    collected_at: DateTime!
    registered_by: String!
    metadata: JSON
  }

  type Claim {
    id: ID!
    content_hash: String!
    content: String!
    claim_type: ClaimType!
    confidence: Float!
    evidence: [Evidence!]!
    source: Source!
    transform_chain: [Transform!]!
    extracted_at: DateTime!
    created_by: String!
    investigation_id: String
    license: License!
    contradicts: [Claim!]!
    corroborates: [Claim!]!
    created_at: DateTime!
  }

  type ChainOfCustodyEntry {
    actor_id: String!
    action: String!
    timestamp: DateTime!
    signature: String!
    justification: String!
  }

  type ManifestItem {
    id: String!
    item_type: ManifestItemType!
    content_hash: String!
    merkle_proof: [String!]!
    source_id: String
    transform_chain: [String!]!
    license_id: String!
    metadata: JSON
  }

  type ExportManifest {
    manifest_id: ID!
    manifest_version: String!
    created_at: DateTime!
    created_by: String!
    bundle_id: String!
    merkle_root: String!
    hash_algorithm: String!
    items: [ManifestItem!]!
    custody_chain: [ChainOfCustodyEntry!]!
    export_type: String!
    classification_level: String!
    retention_policy: String!
    signature: String!
    public_key_id: String!
    licenses: [License!]!
    license_conflicts: [String!]
    data_sources: [String!]
    transformation_chain: [String!]
    authority_basis: [String!]
  }

  type ProvenanceChain {
    item_id: String!
    item_type: ManifestItemType!
    claim: Claim
    evidence: [Evidence!]
    source: Source
    transforms: [Transform!]!
    licenses: [License!]!
    custody_chain: [String!]!
  }

  type ItemVerification {
    item_id: String!
    item_type: ManifestItemType!
    valid: Boolean!
    error: String
  }

  type ChainVerification {
    claim_id: String!
    chain_valid: Boolean!
    chain_length: Int!
    errors: [String!]!
  }

  type VerificationReport {
    manifest_id: String!
    bundle_valid: Boolean!
    signature_valid: Boolean!
    merkle_valid: Boolean!
    item_verifications: [ItemVerification!]!
    chain_verifications: [ChainVerification!]!
    license_issues: [String!]!
    verified_at: DateTime!
    verified_by: String
    verification_details: JSON
  }

  type IngestionResult {
    source: Source!
    transforms: [Transform!]!
    evidence: [Evidence!]!
    claims: [Claim!]!
    provenance_summary: IngestionSummary!
  }

  type IngestionSummary {
    source_hash: String!
    transform_count: Int!
    evidence_count: Int!
    claim_count: Int!
    total_duration_ms: Int!
  }

  # ============================================================================
  # INPUTS
  # ============================================================================

  input LicenseInput {
    license_type: LicenseType!
    license_terms: String
    restrictions: [String!]
    attribution_required: Boolean
    expiration_date: DateTime
    metadata: JSON
  }

  input SourceInput {
    source_hash: String!
    source_type: SourceType!
    origin_url: String
    metadata: JSON
    license_id: ID!
    retention_policy: String
    created_by: String!
  }

  input TransformInput {
    transform_type: TransformType!
    input_hash: String!
    output_hash: String!
    algorithm: String!
    version: String!
    parameters: JSON
    duration_ms: Int!
    executed_by: String!
    confidence: Float
    parent_transforms: [ID!]
    metadata: JSON
  }

  input EvidenceInput {
    evidence_hash: String!
    evidence_type: EvidenceType!
    content_preview: String
    storage_uri: String!
    source_id: ID!
    transform_chain: [ID!]!
    license_id: ID!
    classification_level: String
    registered_by: String!
    metadata: JSON
  }

  input ClaimInput {
    content: String!
    claim_type: ClaimType!
    confidence: Float!
    evidence_ids: [ID!]!
    source_id: ID!
    transform_chain: [ID!]!
    created_by: String!
    investigation_id: ID
    license_id: ID!
    contradicts: [ID!]
    corroborates: [ID!]
  }

  input ExportInput {
    investigation_id: ID
    claim_ids: [ID!]
    export_type: String!
    classification_level: String!
    created_by: String!
    authority_basis: [String!]
  }

  input DocumentIngestInput {
    documentPath: String
    documentContent: String!
    userId: String!
    investigationId: ID
    licenseId: ID!
    metadata: JSON
  }

  input ClaimQueryFilters {
    investigation_id: ID
    created_by: String
    claim_type: ClaimType
    confidence_min: Float
    confidence_max: Float
    source_id: ID
    license_type: LicenseType
    time_range: TimeRangeInput
  }

  input TimeRangeInput {
    start: DateTime!
    end: DateTime!
  }

  # ============================================================================
  # QUERIES
  # ============================================================================

  extend type Query {
    # License queries
    license(id: ID!): License

    # Source queries
    source(id: ID!): Source

    # Transform queries
    transform(id: ID!): Transform
    transformChain(ids: [ID!]!): [Transform!]!

    # Evidence queries
    evidence(id: ID!): Evidence

    # Claim queries
    claim(id: ID!, includeProvenance: Boolean): Claim
    claims(filters: ClaimQueryFilters): [Claim!]!

    # Provenance chain queries
    provenanceChain(itemId: ID!): ProvenanceChain!

    # Export manifest queries
    exportManifest(manifestId: ID!): ExportManifest
    verifyManifest(manifestId: ID!): VerificationReport!
  }

  # ============================================================================
  # MUTATIONS
  # ============================================================================

  extend type Mutation {
    # License mutations
    createLicense(input: LicenseInput!): License!

    # Source mutations
    registerSource(input: SourceInput!): Source!

    # Transform mutations
    registerTransform(input: TransformInput!): Transform!

    # Evidence mutations
    registerEvidence(input: EvidenceInput!): Evidence!

    # Claim mutations
    registerClaim(input: ClaimInput!): Claim!

    # Export mutations
    createExportManifest(input: ExportInput!): ExportManifest!

    # Document ingestion
    ingestDocument(input: DocumentIngestInput!): IngestionResult!
  }
`;

export default provenanceBetaTypeDefs;
