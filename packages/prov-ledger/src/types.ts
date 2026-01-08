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

export type UUID = string;

export interface Transform {
  name: string;
  params: Record<string, any>;
  outHash: string; // sha256 of transformed media bytes
}

export interface MediaAttestation {
  captureSig: string; // device attestation signature (opaque)
  exifHash: string; // sha256(JSON(exif))
  sensorFingerprint?: string;
  transformChain: Transform[];
}

export interface StepCommit {
  id: string;
  tool: string;
  startedAt: string;
  endedAt: string;
  inputHash: string;
  outputHash: string;
  policyHash: string;
  modelHash?: string;
  media?: MediaAttestation;
  contradiction?: { attesterId: string; proof: string };
}

export interface WalletManifest {
  runId: UUID;
  caseId: UUID;
  createdAt: string;
  merkleRoot: string;
  signer: string;
  algo: "RSA-SHA256";
  signature: string; // base64
}

export interface InclusionProof {
  stepId: string;
  leaf: string; // hex
  path: { dir: "L" | "R"; hash: string }[];
}

export interface SelectiveDisclosureBundle {
  manifest: WalletManifest;
  disclosedSteps: StepCommit[];
  proofs: InclusionProof[];
}
