export interface LineageNode {
  id: string;
  type: 'source' | 'transform';
  artifact: string;
  description?: string;
  operation?: string;
  params?: Record<string, unknown>;
  inputs?: string[];
}

export interface LineageDAG {
  nodes: LineageNode[];
}

export interface LineageEnvelope {
  algorithm: 'ed25519' | 'rsa-sha256' | string;
  dag: LineageDAG;
  signature: string;
  publicKey: string;
}

export interface ModelCard {
  name: string;
  version: string;
  description?: string;
  hyperparameters: Record<string, unknown>;
}

export interface ExpectedOutput {
  nodeId: string;
  artifact: string;
  expected: unknown;
  tolerance?: number;
}

export interface Manifest {
  lineage: LineageEnvelope;
  modelCard: ModelCard;
  checksumTree: Record<string, string>;
  deterministicSeed: number;
  expectedOutputs: ExpectedOutput[];
}

export type Fixtures = Record<string, unknown>;

export interface VerificationOptions {
  toleranceMultiplier?: number;
}

export interface NumericVariance {
  actual: number;
  expected: number;
  delta: number;
}

export interface VarianceReport {
  nodeId: string;
  artifact: string;
  withinTolerance: boolean;
  tolerance: number;
  variance: NumericVariance[];
}

export interface ChecksumFailure {
  artifact: string;
  expected: string;
  actual: string;
}

export interface VerificationResult {
  verdict: 'match' | 'variance' | 'error';
  signatureValid: boolean;
  checksumFailures: ChecksumFailure[];
  variances: VarianceReport[];
  evaluatedNodes: string[];
  failureLog: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}
