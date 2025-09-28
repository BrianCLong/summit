export interface ResidencyPolicy {
  policyId: string;
  description?: string;
  allowedRegions: string[];
  denyWithoutValidAttestation: boolean;
  minimumChainLength?: number;
}

export interface RuntimeConfig {
  region: string;
  nodeId: string;
  policy: ResidencyPolicy;
  privateKeyPath: string;
  residencyMetadata?: Record<string, string>;
}

export interface InvocationRequest {
  wasmPath: string;
  exportName: string;
  args?: number[];
}

export interface AttestationPayload {
  runtimeVersion: string;
  region: string;
  nodeId: string;
  policyId: string;
  policyHash: string;
  invocationId: string;
  wasmModuleHash: string;
  exportName: string;
  inputHash: string;
  chainDigest: string;
  previousDigest: string | null;
  timestampLogical: number;
}

export interface ResidencyAttestation extends AttestationPayload {
  signature: string;
  publicKey: string;
}

export interface InvocationResult<T = unknown> {
  result: T;
  attestation: ResidencyAttestation;
}

export interface ChainState {
  height: number;
  headDigest: string | null;
}
