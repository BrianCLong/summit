/**
 * Provenance Ledger Beta - Type Definitions
 * Comprehensive types for Source, Transform, Evidence, Claim, and Export manifests
 */

// ============================================================================
// LICENSE TYPES
// ============================================================================
export type LicenseType = 'public' | 'internal' | 'restricted' | 'classified';

export interface License {
  id: string;
  license_type: LicenseType;
  license_terms?: string;
  restrictions: string[];
  attribution_required: boolean;
  expiration_date?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface LicenseInput {
  license_type: LicenseType;
  license_terms?: string;
  restrictions?: string[];
  attribution_required?: boolean;
  expiration_date?: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// SOURCE TYPES
// ============================================================================
export type SourceType = 'document' | 'database' | 'api' | 'user_input' | 'sensor';

export interface Source {
  id: string;
  source_hash: string;
  source_type: SourceType;
  origin_url?: string;
  ingestion_timestamp: Date;
  metadata: {
    format?: string;
    size_bytes?: number;
    encoding?: string;
    author?: string;
    created_date?: Date;
    [key: string]: any;
  };
  license_id: string;
  custody_chain: string[];
  retention_policy: string;
  created_by: string;
  created_at: Date;
}

export interface SourceInput {
  source_hash: string;
  source_type: SourceType;
  origin_url?: string;
  metadata?: Record<string, any>;
  license_id: string;
  retention_policy?: string;
  created_by: string;
}

// ============================================================================
// TRANSFORM TYPES
// ============================================================================
export type TransformType =
  | 'extract'
  | 'ocr'
  | 'translate'
  | 'normalize'
  | 'enrich'
  | 'extract_claim'
  | 'deduplicate'
  | 'classify'
  | 'redact';

export interface Transform {
  id: string;
  transform_type: TransformType;
  input_hash: string;
  output_hash: string;
  algorithm: string;
  version: string;
  parameters: Record<string, any>;
  execution_timestamp: Date;
  duration_ms: number;
  executed_by: string;
  confidence?: number;
  parent_transforms: string[];
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface TransformInput {
  transform_type: TransformType;
  input_hash: string;
  output_hash: string;
  algorithm: string;
  version: string;
  parameters?: Record<string, any>;
  duration_ms: number;
  executed_by: string;
  confidence?: number;
  parent_transforms?: string[];
  metadata?: Record<string, any>;
}

// ============================================================================
// EVIDENCE TYPES
// ============================================================================
export type EvidenceType =
  | 'document'
  | 'image'
  | 'video'
  | 'log'
  | 'testimony'
  | 'sensor_data'
  | 'database_record';

export interface Evidence {
  id: string;
  evidence_hash: string;
  evidence_type: EvidenceType;
  content_preview?: string;
  storage_uri: string;
  source_id: string;
  transform_chain: string[];
  license_id: string;
  classification_level: string;
  collected_at: Date;
  registered_by: string;
  metadata?: Record<string, any>;
}

export interface EvidenceInput {
  evidence_hash: string;
  evidence_type: EvidenceType;
  content_preview?: string;
  storage_uri: string;
  source_id: string;
  transform_chain: string[];
  license_id: string;
  classification_level?: string;
  registered_by: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// CLAIM TYPES
// ============================================================================
export type ClaimType = 'factual' | 'inferential' | 'predictive' | 'evaluative';
export type ClaimEvidenceRelationType = 'SUPPORTS' | 'CONTRADICTS';

export interface ClaimEvidenceLink {
  id: string;
  claim_id: string;
  evidence_id: string;
  relation_type: ClaimEvidenceRelationType;
  confidence?: number;
  created_by: string;
  created_at: Date;
  notes?: string;
}

export interface ClaimEvidenceLinkInput {
  claim_id: string;
  evidence_id: string;
  relation_type: ClaimEvidenceRelationType;
  confidence?: number;
  created_by: string;
  notes?: string;
}

export interface Claim {
  id: string;
  content_hash: string;
  content: string;
  claim_type: ClaimType;
  confidence: number;
  evidence_ids: string[];
  source_id: string;
  transform_chain: string[];
  extracted_at: Date;
  created_by: string;
  investigation_id?: string;
  license_id: string;
  contradicts: string[];
  corroborates: string[];
  created_at: Date;
}

export interface ClaimInput {
  content: string;
  claim_type: ClaimType;
  confidence: number;
  evidence_ids: string[];
  source_id: string;
  transform_chain: string[];
  created_by: string;
  investigation_id?: string;
  license_id: string;
  contradicts?: string[];
  corroborates?: string[];
}

// ============================================================================
// CHAIN OF CUSTODY
// ============================================================================
export interface ChainOfCustodyEntry {
  actor_id: string;
  action: string;
  timestamp: Date;
  signature: string;
  justification: string;
}

// ============================================================================
// MERKLE TREE TYPES
// ============================================================================
export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: any;
}

export interface MerkleTree {
  root: string;
  nodes: MerkleNode[];
  leaves: { hash: string; data: any }[];
}

export interface MerkleProof {
  leaf_hash: string;
  proof: string[];
  root_hash: string;
}

// ============================================================================
// EXPORT MANIFEST TYPES
// ============================================================================
export type ManifestItemType = 'claim' | 'evidence' | 'source' | 'transform';

export interface ManifestItem {
  id: string;
  item_type: ManifestItemType;
  content_hash: string;
  merkle_proof: string[];
  source_id?: string;
  transform_chain: string[];
  license_id: string;
  metadata?: Record<string, any>;
}

export interface ExportManifest {
  manifest_id: string;
  manifest_version: string;
  created_at: Date;
  created_by: string;
  bundle_id: string;
  merkle_root: string;
  merkle_tree_id?: string;
  hash_algorithm: 'SHA-256' | 'SHA3-256';
  items: ManifestItem[];
  custody_chain: ChainOfCustodyEntry[];
  export_type: string;
  classification_level: string;
  retention_policy: string;
  signature: string;
  public_key_id: string;
  licenses: License[];
  license_conflicts?: string[];
  data_sources?: string[];
  transformation_chain?: string[];
  authority_basis?: string[];
}

export interface ExportManifestInput {
  export_type: string;
  classification_level: string;
  retention_policy?: string;
  created_by: string;
  authority_basis?: string[];
}

// ============================================================================
// VERIFICATION TYPES
// ============================================================================
export interface ItemVerification {
  item_id: string;
  item_type: ManifestItemType;
  valid: boolean;
  error?: string;
}

export interface ChainVerification {
  claim_id: string;
  chain_valid: boolean;
  chain_length: number;
  errors: string[];
}

export interface VerificationReport {
  manifest_id: string;
  bundle_valid: boolean;
  signature_valid: boolean;
  merkle_valid: boolean;
  item_verifications: ItemVerification[];
  chain_verifications: ChainVerification[];
  license_issues: string[];
  verified_at: Date;
  verified_by?: string;
  verification_details?: Record<string, any>;
}

// ============================================================================
// PROVENANCE CHAIN TYPES
// ============================================================================
export interface ProvenanceChainEntry {
  id: string;
  parent_hash?: string;
  content_hash: string;
  operation_type: string;
  actor_id: string;
  timestamp: Date;
  metadata: Record<string, any>;
  signature?: string;
}

export interface ProvenanceChain {
  item_id: string;
  item_type: ManifestItemType;
  source?: Source;
  transforms: Transform[];
  evidence?: Evidence[];
  claim?: Claim;
  licenses: License[];
  custody_chain: string[];
}

// ============================================================================
// BUNDLE TYPES
// ============================================================================
export interface DisclosureBundle {
  bundle_id: string;
  bundle_hash: string;
  manifest: ExportManifest;
  claims: Claim[];
  evidence: Evidence[];
  sources: Source[];
  transforms: Transform[];
  created_at: Date;
  immutable_seal: string;
}

export interface BundleCreateInput {
  investigation_id?: string;
  claim_ids?: string[];
  export_type: string;
  classification_level: string;
  created_by: string;
  authority_basis?: string[];
}

// ============================================================================
// QUERY FILTERS
// ============================================================================
export interface ProvenanceQueryFilters {
  actor_id?: string;
  operation_type?: string;
  time_range?: {
    start: Date;
    end: Date;
  };
  investigation_id?: string;
  claim_id?: string;
  source_id?: string;
}

export interface ClaimQueryFilters {
  investigation_id?: string;
  created_by?: string;
  claim_type?: ClaimType;
  confidence_min?: number;
  confidence_max?: number;
  source_id?: string;
  license_type?: LicenseType;
  time_range?: {
    start: Date;
    end: Date;
  };
}

// ============================================================================
// SERVICE RESPONSE TYPES
// ============================================================================
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface BatchServiceResponse<T> {
  success: boolean;
  data: T[];
  errors: { item_id: string; error: string }[];
  metadata?: Record<string, any>;
}

// ============================================================================
// HASH COMPUTATION TYPES
// ============================================================================
export interface HashComputationOptions {
  algorithm?: 'sha256' | 'sha3-256';
  encoding?: 'hex' | 'base64';
  normalize?: boolean;
}

export interface HashResult {
  hash: string;
  algorithm: string;
  timestamp: Date;
}
