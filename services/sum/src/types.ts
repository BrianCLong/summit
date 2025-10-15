export interface UdfMetadata {
  name?: string;
  version?: string;
  description?: string;
  capabilities?: string[];
}

export interface UdfSubmission {
  tenantId: string;
  code: string;
  metadata?: UdfMetadata;
}

export interface AnalysisIssue {
  message: string;
  rule: string;
  severity: 'error' | 'warning';
  location?: {
    line: number;
    column: number;
  };
}

export interface StaticAnalysisResult {
  passed: boolean;
  issues: AnalysisIssue[];
  taintPaths: string[];
  policyVersion: string;
}

export interface SandboxQuota {
  cpuMs: number;
  wallClockMs: number;
  maxOutputSize: number;
  maxBufferBytes: number;
}

export interface SandboxOptions {
  allowedGlobals: string[];
  allowedHosts: string[];
  quotas: SandboxQuota;
}

export type SandboxStatus = 'success' | 'timeout' | 'quota-exceeded' | 'runtime-error';

export interface SandboxResult {
  status: SandboxStatus;
  error?: string;
  outputDigest?: string;
  logs: string[];
  policyVersion: string;
}

export type SafetyRating = 'rejected' | 'high-risk' | 'medium-risk' | 'low-risk';

export interface RatingResult {
  rating: SafetyRating;
  score: number;
  rationale: string[];
}

export interface CertificationArtifact {
  submissionHash: string;
  tenantId: string;
  analysis: StaticAnalysisResult;
  sandbox: SandboxResult;
  rating: RatingResult;
  signature: string;
  issuedAt: string;
  policyVersion: string;
}

export interface PipelineResult {
  accepted: boolean;
  artifact: CertificationArtifact;
}

export interface DeterministicInputSnapshot {
  codeHash: string;
  metadataHash: string;
  tenantId: string;
  policyVersion: string;
}
