export type EvidenceReport = {
  evidence_id: string;
  item: {
    source: string;
    date: string;
  };
  summary: string;
  artifacts: string[];
};

export type EvidenceMetrics = {
  satisfaction: number;
  scenarios_total: number;
  scenarios_passed: number;
};

export type EvidenceStamp = {
  created_at: string;
};

export type EvidenceIndexEntry = {
  evidence_id: string;
  paths: string[];
};

export type EvidenceIndexItem = {
  evidence_id: string;
  files: {
    report: string;
    metrics: string;
    stamp: string;
  };
};

export type EvidenceIndex = {
  version: number;
  entries: EvidenceIndexEntry[];
  items: EvidenceIndexItem[];
};

export type EvidenceBundleInput = {
  runId: string;
  report: EvidenceReport;
  metrics: EvidenceMetrics;
  createdAt?: string;
  baseDir?: string;
};
