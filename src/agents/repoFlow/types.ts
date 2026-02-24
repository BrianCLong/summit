export type EvidenceReport = {
  evidenceId: string;
  repo: { url: string; ref: string };
  changes: { filesTouched: string[] };
  sandbox: { profile: string; exitCode: number };
  policy: {
    decision: 'allow' | 'deny';
    reasons: string[];
    policyHash: string;
  };
};

export type EvidenceMetrics = {
  evidenceId: string;
  filesTouchedCount: number;
  sandboxDurationMs: number;
  sandboxExitCode: number;
  policyDecision: 'allow' | 'deny';
};

export type EvidenceStamp = {
  evidenceId: string;
  gitSha: string;
  policyHash: string;
  schemaVersion: string;
};

export type PolicyDecision = {
  decision: 'allow' | 'deny';
  reasons: string[];
  policyHash: string;
};

export type SandboxProfile = {
  id: string;
  timeoutMs: number;
  networkEnabled: boolean;
};

export type SandboxResult = {
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
};

export type RepoFlowRequest = {
  repoDir: string;
  repoUrl: string;
  ref: string;
  slug: string;
  changeDescription: string;
};

export type RepoFlowResult = {
  evidenceId: string;
  reportPath: string;
  policyDecision: PolicyDecision;
  branchName: string;
  commitSha: string;
};
