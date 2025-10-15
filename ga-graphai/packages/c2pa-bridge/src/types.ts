export type SignatureAlgorithm = 'rsa-sha256' | 'ed25519';

export interface ToolChainEntry {
  name: string;
  version: string;
  parameters?: Record<string, string>;
}

export interface ClaimMetadata {
  toolChain: ToolChainEntry[];
  datasetLineageId: string;
  policyHash: string;
  notes?: string;
}

export interface SignerDescriptor {
  id: string;
  publicKeyFingerprint: string;
  algorithm: SignatureAlgorithm;
}

export interface SignerInput extends Omit<SignerDescriptor, 'publicKeyFingerprint'> {
  privateKey: string;
  publicKey: string;
  mimeType?: string;
}

export interface AssetDescriptor {
  name: string;
  hash: string;
  mimeType?: string;
}

export interface ParentReference {
  manifestHash: string;
  assetHash: string;
  signerId: string;
  timestamp: string;
}

export interface ProvenanceClaim {
  toolChain: ToolChainEntry[];
  datasetLineageId: string;
  policyHash: string;
  timestamp: string;
  signer: SignerDescriptor;
  redactions?: string[];
  notes?: string;
}

export interface ProvenanceManifest {
  version: string;
  asset: AssetDescriptor;
  claim: ProvenanceClaim;
  parent?: ParentReference;
  signature: string;
}

export interface StampAssetOptions {
  assetPath: string;
  outputPath?: string;
  metadata: ClaimMetadata;
  signer: SignerInput;
}

export interface DerivativeStampOptions {
  assetPath: string;
  parentManifestPath: string;
  parentPublicKey: string;
  parentAssetPath?: string;
  outputPath?: string;
  redactions?: string[];
  metadata?: Partial<ClaimMetadata>;
  signer: SignerInput;
}

export interface VerifyProvenanceOptions {
  manifestPath: string;
  publicKey: string;
  assetPath?: string;
  parentManifestPath?: string;
  parentPublicKey?: string;
  parentAssetPath?: string;
}

export interface VerificationIssue {
  level: 'error' | 'warning';
  message: string;
}

export interface VerificationResult {
  manifest: ProvenanceManifest;
  manifestHash: string;
  claimHash: string;
  validSignature: boolean;
  validAssetHash: boolean;
  issues: VerificationIssue[];
  signerId: string;
  parent?: VerificationResult;
}

export interface BrowserVerificationOptions {
  manifest: ProvenanceManifest;
  publicKey: string;
  asset: ArrayBuffer;
}

export interface BrowserVerificationResult {
  validSignature: boolean;
  validAssetHash: boolean;
  issues: VerificationIssue[];
  claimHash: string;
  manifestHash: string;
}
