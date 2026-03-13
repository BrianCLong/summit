export type EvidenceItem = {
  id: string;
  kind: string;        // e.g., "log", "report", "post", "sensor"
  signal: string;      // normalized string signal
  ts: string;          // ISO date-time
};

export type MatchedIndicator = {
  indicatorId: string;
  evidenceId: string;
  score: number; // 0..1
};

export type PGHypothesis = {
  playbookId: string;
  branch: {
    stepIdsConsidered: string[];
    stepIdsPlausible: string[];
  };
  confidence: number;
  matchedIndicators: MatchedIndicator[];
  missingEvidence: string[];
  notes: string; // analytic explanation ONLY
};
