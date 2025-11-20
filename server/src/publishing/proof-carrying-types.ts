/**
 * Proof-Carrying Publishing Types
 *
 * Defines the schema for verifiable manifests that bundle:
 * - Hash trees (Merkle trees for integrity)
 * - Model cards (data lineage, transforms, metadata)
 * - License terms and citations
 * - Revocation support
 */

/**
 * Merkle tree node for hierarchical hashing
 */
export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: string; // Original data for leaf nodes
}

/**
 * Hash tree structure for bundle integrity verification
 */
export interface HashTree {
  root: string; // Merkle root hash
  algorithm: 'sha256' | 'sha512';
  nodes: MerkleNode[];
  leaves: Array<{
    path: string;
    hash: string;
    size: number;
  }>;
  createdAt: string; // ISO 8601
}

/**
 * Data transformation record
 */
export interface TransformRecord {
  id: string;
  type: 'REDACTION' | 'FILTERING' | 'ANONYMIZATION' | 'AGGREGATION' | 'DERIVATION';
  timestamp: string;
  inputHash: string;
  outputHash: string;
  parameters: Record<string, unknown>;
  operator: string; // User/agent who performed transform
  justification?: string;
}

/**
 * Model card - describes data lineage and characteristics
 */
export interface ModelCard {
  id: string;
  version: string;
  name: string;
  description: string;

  // Data lineage
  sources: Array<{
    id: string;
    type: 'database' | 'api' | 'file' | 'stream';
    location: string;
    timestamp: string;
    hash?: string;
  }>;

  // Transform chain
  transforms: TransformRecord[];

  // Data characteristics
  schema?: Record<string, unknown>;
  recordCount?: number;
  dataSensitivity: 'public' | 'internal' | 'confidential' | 'restricted';

  // Quality metrics
  qualityMetrics?: {
    completeness?: number; // 0-1
    accuracy?: number;
    consistency?: number;
    timeliness?: number;
  };

  // Provenance
  createdAt: string;
  createdBy: string;
  lastModified: string;
}

/**
 * License information
 */
export interface LicenseInfo {
  spdxId: string; // e.g., 'MIT', 'Apache-2.0', 'GPL-3.0'
  name: string;
  url?: string;
  text?: string;
  requiresAttribution: boolean;
  allowsCommercialUse: boolean;
  allowsModification: boolean;
  copyleft: boolean;
}

/**
 * Citation information
 */
export interface Citation {
  id: string;
  type: 'data' | 'model' | 'code' | 'publication';
  required: boolean; // If true, missing citation blocks publish

  // Citation details
  title: string;
  authors?: string[];
  organization?: string;
  url?: string;
  doi?: string;
  version?: string;

  // License
  license: LicenseInfo;

  // Verification
  verified: boolean;
  verifiedAt?: string;
  verificationMethod?: 'manual' | 'automated' | 'registry';
}

/**
 * Audience scope for evidence wallet
 */
export interface AudienceScope {
  id: string;
  name: string;
  description: string;

  // Access control
  allowedRoles?: string[];
  allowedOrganizations?: string[];
  allowedUsers?: string[];

  // Data restrictions
  maxSensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  requiredClearance?: string[];

  // Geographic restrictions
  allowedRegions?: string[];
  prohibitedRegions?: string[];

  // Time restrictions
  validFrom?: string;
  validUntil?: string;
}

/**
 * Evidence wallet - audience-scoped proof bundle
 */
export interface EvidenceWallet {
  id: string;
  bundleId: string;

  // Audience scoping
  audience: AudienceScope;

  // Contents
  manifest: ProofCarryingManifest;
  artifacts: string[]; // Paths to included artifacts

  // Cryptographic proof
  signature: string;
  signatureAlgorithm: 'RSA-SHA256' | 'ECDSA-SHA256' | 'Ed25519';
  publicKey: string;

  // Revocation
  revocable: boolean;
  revocationListUrl?: string;

  // Metadata
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
}

/**
 * Revocation record
 */
export interface RevocationRecord {
  id: string;
  walletId: string;
  bundleId: string;

  // Revocation details
  revokedAt: string;
  revokedBy: string;
  reason: 'compromised' | 'expired' | 'superseded' | 'withdrawn' | 'other';
  reasonDetail?: string;

  // Propagation tracking
  propagatedTo: string[]; // Registry URLs where revocation was propagated
  propagationStatus: 'pending' | 'complete' | 'partial' | 'failed';

  // Verification
  signature: string;
  signatureAlgorithm: string;
}

/**
 * Complete Proof-Carrying Manifest
 */
export interface ProofCarryingManifest {
  version: '1.0';
  id: string;
  bundleId: string;

  // Core components
  hashTree: HashTree;
  modelCards: ModelCard[];
  citations: Citation[];
  licenses: LicenseInfo[];

  // Bundle metadata
  metadata: {
    name: string;
    description: string;
    version: string;
    createdAt: string;
    createdBy: string;
    organization?: string;
    contact?: string;

    // Compliance
    complianceFrameworks?: string[]; // e.g., ['GDPR', 'CCPA', 'HIPAA']
    securityClassification?: string;
    dataRetentionPolicy?: string;
  };

  // Verification info
  verification: {
    offlineVerifiable: boolean;
    verificationScript?: string; // Path to standalone verification script
    requiredTools?: string[]; // e.g., ['openssl', 'sha256sum']
    verificationInstructions?: string;
  };

  // Cryptographic proof
  signature: string;
  signatureAlgorithm: 'RSA-SHA256' | 'ECDSA-SHA256' | 'Ed25519';
  publicKey: string;
  signingCertificate?: string;

  // Timestamps
  createdAt: string;
  expiresAt?: string;

  // Revocation
  revocable: boolean;
  revocationListUrl?: string;
  revocationCheckRequired: boolean;
}

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean;
  timestamp: string;

  // Detailed checks
  checks: {
    hashTreeValid: boolean;
    signatureValid: boolean;
    citationsComplete: boolean;
    licensesValid: boolean;
    notRevoked: boolean;
    notExpired: boolean;
  };

  // Issues found
  errors: string[];
  warnings: string[];

  // Metadata
  verifiedOffline: boolean;
  verificationDuration: number; // milliseconds
}

/**
 * Publishing validation result
 */
export interface PublishValidationResult {
  canPublish: boolean;
  blockers: string[]; // Reasons why publishing is blocked
  warnings: string[];
  missingCitations: Citation[];
  licenseIssues: string[];
}
