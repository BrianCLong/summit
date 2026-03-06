export type EvidenceReport = {
  evidenceId: string;
  runId: string;
  agent: {
    name: string;
    version: string;
  };
  inputSummary: string;
  decisions: Array<{
    step: string;
    rationale: string;
  }>;
  outputs: Array<{
    kind: string;
    ref: string;
  }>;
};

export type EvidenceMetrics = {
  evidenceId: string;
  runId: string;
  counters: Record<string, number>;
};

export type EvidenceStamp = {
  evidenceId: string;
  runId: string;
  createdAtIso: string;
};

export type EvidenceIndex = Record<
  string,
  {
    report: string;
    metrics: string;
    stamp: string;
  }
>;

export type EvidenceBundle = {
  report: EvidenceReport;
  metrics: EvidenceMetrics;
  stamp: EvidenceStamp;
};

export type EvidencePaths = {
  report: string;
  metrics: string;
  stamp: string;
};
