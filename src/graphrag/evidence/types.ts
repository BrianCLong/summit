export type EvidenceIndexEntry = {
  evidence_id: string;
  files: string[];
};

export type EvidenceBundleInput = {
  outDir: string;
  runId: string;
  report: unknown;
  metrics: unknown;
  stamp: unknown;
  index: EvidenceIndexEntry[];
};

export type EvidenceWriteResult = {
  written: boolean;
  outDir: string;
  files?: {
    report: string;
    metrics: string;
    stamp: string;
    index: string;
  };
};
