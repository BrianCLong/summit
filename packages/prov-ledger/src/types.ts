export interface Evidence {
  id: string;
  contentHash: string;
  licenseId: string;
  source: string;
  transforms: string[]; // IDs of transformations applied
  timestamp: string;
  metadata?: Record<string, any>;
  hash: string; // Hash of the complete record
}

export interface Transformation {
  id: string;
  tool: string;
  version: string;
  params: Record<string, any>;
  inputHash: string;
  outputHash: string;
  timestamp: string;
  hash: string; // Hash of the complete record
}

export interface Claim {
  id: string;
  evidenceIds: string[];
  transformChainIds: string[];
  text: string; // The claim content
  timestamp: string;
  hash: string; // Hash of the claim content + evidence IDs
  signature?: string;
  publicKey?: string;
}

export interface Manifest {
  version: string;
  timestamp: string;
  generatedBy: string;
  merkleRoot: string;
  claims: Claim[];
  evidence: Evidence[];
  transformations: Transformation[];
  metadata?: Record<string, any>;
  signature?: string;
}

export interface LedgerConfig {
  dataDir: string;
  enabled: boolean;
}
