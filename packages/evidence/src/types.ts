export type EvidenceReport = {
  evidence_id?: string;
  packName?: string;
  runId: string;
  policyResults?: {
    hooks: Record<string, boolean>;
    mcp: boolean;
  };
  metrics?: Record<string, any>;
  [key: string]: any;
};

export type EvidenceStamp = {
  hash: string;
  version: string;
  // No timestamps here for determinism
};
