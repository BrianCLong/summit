import type { PGUseCase } from '../policy/pgPolicy';

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

export type PGIndicator = {
  id: string;
  signal: string;
  weight: number;
};

export type PGActionSignature = {
  id: string;
  label: string;
  indicators: PGIndicator[];
};

export type PGPlaybookStep = {
  id: string;
  actionSignatureId: string;
};

export type PGPlaybookOutcome = {
  description?: string;
};

export type PGPlaybookContentSafety = {
  analyticOnly?: boolean;
  forbidPrescriptive?: boolean;
};

export type PGPlaybook = {
  id: string;
  name?: string;
  useCase?: PGUseCase;
  steps: PGPlaybookStep[];
  outcomes?: PGPlaybookOutcome[];
  provenance?: {
    source?: string;
  };
  contentSafety?: PGPlaybookContentSafety;
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
