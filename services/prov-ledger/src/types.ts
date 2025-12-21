export interface ClaimInput {
  sourceUri: string;
  hash: string;
  type: string;
  confidence: number;
  licenseId: string;
}

export interface Claim extends ClaimInput {
  id: string;
  createdAt: string;
}

export interface EvidenceInput {
  claimId: string;
  artifactDigest: string;
  transformChain?: TransformStep[];
}

export interface TransformStep {
  transformType: string;
  actorId: string;
  timestamp: string;
  config?: Record<string, unknown>;
}

export interface Evidence {
  id: string;
  claimId: string;
  artifactDigest: string;
  transformChain: TransformStep[];
  createdAt: string;
}

export interface ProvenanceInput {
  claimId: string;
  transforms: string[];
  sources: string[];
  lineage: Record<string, unknown>;
}

export interface ProvenanceChain extends ProvenanceInput {
  id: string;
  createdAt: string;
}

export interface ManifestLeaf {
  type: 'claim' | 'evidence' | 'ledger';
  hash: string;
  refId?: string;
}

export interface Manifest {
  bundleId: string;
  version: string;
  generatedAt: string;
  merkleRoot: string;
  leaves: ManifestLeaf[];
  tree: { root: string; levels: string[][] };
  claim: Claim;
  evidence: Evidence[];
}

