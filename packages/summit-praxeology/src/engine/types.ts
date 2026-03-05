export type EvidenceItem = {
  id: string;
  kind: string;
  signal: string;
  ts: string;
};

export type MatchedIndicator = {
  indicatorId: string;
  evidenceId: string;
  score: number;
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
  notes: string;
};
