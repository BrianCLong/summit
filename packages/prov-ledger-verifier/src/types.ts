export interface TransformStep {
  id: string;
  type: string;
  actor: string;
  timestamp: string;
  inputHash?: string;
  outputHash?: string;
  parameters?: Record<string, unknown>;
}

export interface EvidenceRecord {
  id: string;
  path: string;
  sha256: string;
  transforms: TransformStep[];
  claims?: string[];
}

export interface ClaimRecord {
  id: string;
  statement?: string;
  evidenceIds: string[];
  hash?: string;
}

export interface HashTree {
  algorithm: "sha256";
  leaves: Array<{ id: string; hash: string }>;
  root: string;
}

export interface BundleManifest {
  version: string;
  bundleId: string;
  generatedAt: string;
  hashAlgorithm: "sha256";
  evidence: EvidenceRecord[];
  claims?: ClaimRecord[];
  hashTree?: HashTree;
}

export interface CheckResult {
  name: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  details?: Record<string, unknown>;
}

export interface VerificationReport {
  ok: boolean;
  bundlePath: string;
  manifestPath: string;
  manifest: BundleManifest | null;
  checks: {
    manifestStructure: CheckResult;
    evidenceHashes: CheckResult;
    hashTree: CheckResult;
    transformChains: CheckResult;
    claimReferences: CheckResult;
  };
  summary: {
    evidenceCount: number;
    claimCount: number;
    missingEvidence: string[];
    hashMismatches: string[];
  };
}
