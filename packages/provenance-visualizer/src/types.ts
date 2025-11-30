/**
 * Types for provenance visualization
 */

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

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  level: number;
  isLeaf: boolean;
  evidenceId?: string;
}

export interface VerificationResult {
  valid: boolean;
  expected_hash: string;
  actual_hash: string;
  verified_at: string;
  tampered?: boolean;
  tamperedNodes?: string[];
}

export interface ChainOfCustodyEvent {
  timestamp: string;
  actorId: string;
  action: string;
  evidenceId: string;
  hash: string;
  signature?: string;
  metadata?: Record<string, any>;
}
