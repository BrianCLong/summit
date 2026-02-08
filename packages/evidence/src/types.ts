export type MWSEvidenceReport = {
  packName: string;
  runId: string;
  policyResults: {
    hooks: Record<string, boolean>;
    mcp: boolean;
  };
  // metrics embedded in report for MWS
  metrics: {
    duration: number;
    toolsUsed: number;
  };
  eid?: string;
};

export type GenericEvidenceReport = {
  eid: string;
  [key: string]: any;
};

export type EvidenceReport = MWSEvidenceReport | GenericEvidenceReport;

export type EvidenceMetrics = Record<string, any>;

export type EvidenceStamp = {
  hash: string;
  version: string;
  date?: string; // ISO timestamp allowed in stamp
};
