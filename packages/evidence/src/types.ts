export type EvidenceReport = {
  packName: string;
  runId: string;
  policyResults: {
    hooks: Record<string, boolean>;
    mcp: boolean;
  };
  metrics: {
    duration: number;
    toolsUsed: number;
  };
};

export type EvidenceStamp = {
  hash: string;
  version: string;
  // No timestamps here for determinism
};

export enum EvidenceArtifact {
  REPORT = 'report',
  METRICS = 'metrics',
  STAMP = 'stamp',
}

export type ScopedEvidence = {
  domain: string;
  scopeId: string;
  version: string;
  report: Record<string, any>;
  metrics: Record<string, any>;
};
