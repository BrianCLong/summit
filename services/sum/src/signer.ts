import { canonicalize, hmacSha256, sha256 } from './utils/canonical.js';
import type { CertificationArtifact, DeterministicInputSnapshot, PipelineResult, RatingResult, SandboxResult, StaticAnalysisResult, UdfSubmission } from './types.js';

const POLICY_VERSION = 'sum-signer-v1';
const DEFAULT_SECRET = 'sum-secret-not-for-production';

export interface SigningConfig {
  secret?: string;
  policyVersion?: string;
}

export function buildDeterministicSnapshot(submission: UdfSubmission): DeterministicInputSnapshot {
  return {
    codeHash: sha256(submission.code),
    metadataHash: sha256(canonicalize(submission.metadata ?? {})),
    tenantId: submission.tenantId,
    policyVersion: POLICY_VERSION,
  };
}

export function signArtifact(
  submission: UdfSubmission,
  analysis: StaticAnalysisResult,
  sandbox: SandboxResult,
  rating: RatingResult,
  config: SigningConfig = {}
): CertificationArtifact {
  const snapshot = buildDeterministicSnapshot(submission);
  const payload = canonicalize({
    snapshot,
    analysis,
    sandbox,
    rating,
    policyVersion: config.policyVersion ?? POLICY_VERSION,
  });

  const secret = config.secret ?? process.env.SUM_SIGNING_SECRET ?? DEFAULT_SECRET;
  const signature = hmacSha256(secret, payload);

  return {
    submissionHash: snapshot.codeHash,
    tenantId: submission.tenantId,
    analysis,
    sandbox,
    rating,
    signature,
    issuedAt: new Date().toISOString(),
    policyVersion: config.policyVersion ?? POLICY_VERSION,
  } satisfies CertificationArtifact;
}

export function finalizePipeline(
  submission: UdfSubmission,
  analysis: StaticAnalysisResult,
  sandbox: SandboxResult,
  rating: RatingResult,
  config: SigningConfig = {}
): PipelineResult {
  const artifact = signArtifact(submission, canonicalClone(analysis), canonicalClone(sandbox), canonicalClone(rating), config);
  const accepted = analysis.passed && sandbox.status === 'success';
  return { accepted, artifact } satisfies PipelineResult;
}

function canonicalClone<T>(value: T): T {
  return JSON.parse(canonicalize(value)) as T;
}
