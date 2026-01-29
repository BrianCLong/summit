export type EvidenceReport = {
  evidence_id: string;
  gate: string;
  findings: any[];
  ok: boolean;
};

export type EvidenceMetrics = {
  evidence_id: string;
  durations_ms: Record<string, number>;
  counters: Record<string, number>;
};

export type EvidenceStamp = {
  evidence_id: string;
  created_at: string;
  git_sha?: string;
  runner_version?: string;
};
