/**
 * Type definitions for Prov-Ledger Service Client
 * Shared types for communicating with the provenance and claims ledger
 */

// ============================================================================
// Core Entity Types
// ============================================================================

export interface TransformStep {
  transformType: string;
  timestamp: string;
  actorId: string;
  config?: Record<string, any>;
}

export interface Claim {
  id: string;
  content: Record<string, any>;
  hash: string;
  signature?: string;
  metadata?: Record<string, any>;
  sourceRef?: string;
  licenseId?: string;
  policyLabels: string[];
  created_at: string;
}

export interface Evidence {
  id: string;
  caseId?: string;
  sourceRef: string;
  checksum: string;
  checksumAlgorithm: string;
  contentType?: string;
  fileSize?: number;
  transformChain: TransformStep[];
  licenseId?: string;
  policyLabels: string[];
  authorityId?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ProvenanceChain {
  id: string;
  claim_id: string;
  transforms: string[];
  sources: string[];
  lineage: Record<string, any>;
  created_at: string;
}

export interface DisclosureBundle {
  caseId: string;
  version: string;
  evidence: Array<{
    id: string;
    sourceRef: string;
    checksum: string;
    transformChain: TransformStep[];
  }>;
  hashTree: string[];
  merkleRoot: string;
  generated_at: string;
}

export interface Manifest {
  version: string;
  claims: Array<{
    id: string;
    hash: string;
    transforms: string[];
  }>;
  hash_chain: string;
  signature?: string;
  generated_at: string;
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateClaimRequest {
  content: Record<string, any>;
  signature?: string;
  metadata?: Record<string, any>;
  sourceRef?: string;
  licenseId?: string;
  policyLabels?: string[];
}

export interface CreateEvidenceRequest {
  caseId?: string;
  sourceRef: string;
  content?: any; // For computing checksum if not provided
  checksum?: string;
  checksumAlgorithm?: string;
  contentType?: string;
  fileSize?: number;
  transformChain?: TransformStep[];
  licenseId?: string;
  policyLabels?: string[];
  metadata?: Record<string, any>;
}

export interface CreateProvenanceRequest {
  claimId: string;
  transforms: string[];
  sources: string[];
  lineage: Record<string, any>;
}

export interface VerifyHashRequest {
  content: any;
  expectedHash: string;
}

export interface VerifyHashResponse {
  valid: boolean;
  expected_hash: string;
  actual_hash: string;
  verified_at: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class ProvLedgerError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ProvLedgerError';
  }
}
