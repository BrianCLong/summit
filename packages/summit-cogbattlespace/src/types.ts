export type ISODateTime = string;

export type ArtifactKind =
  | 'post'
  | 'article'
  | 'video'
  | 'image'
  | 'document'
  | 'transcript';

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  source: { platform: string; uri: string };
  observedAt: ISODateTime;
  content: { text: string; language?: string; hash?: string };
  provenance: { collector: string; collectedAt: ISODateTime; chain?: string[] };
};

export type Narrative = {
  id: string;
  label: string;
  summary: string;
  firstSeen: ISODateTime;
  lastSeen: ISODateTime;
  variants: Array<{ id: string; text: string; count: number }>;
  frames: string[];
  rhetoricalMoves: string[];
  metrics: { velocity: number; reach: number; channels: string[] };
  provenance: { derivedFromArtifacts: string[]; method?: string };
};

export type Belief = {
  id: string;
  proposition: string;
  polarity: 'support' | 'oppose' | 'uncertain';
  confidence: number;
  timeSeries: Array<{
    t: ISODateTime;
    cohortId: string;
    prevalence: number;
    uncertainty: number;
  }>;
  provenance: { evidenceArtifacts: string[]; estimator?: string };
};

export type RealityClaim = {
  id: string;
  statement: string;
  status: 'unverified' | 'verified' | 'disputed';
  confidence: number;
  evidenceRefs: string[];
};

export type NarrativeClaimLink = {
  id: string;
  narrativeId: string;
  claimId: string;
  type: 'references' | 'contradicts' | 'misrepresents' | 'unclear';
  score: number;
  observedAt: ISODateTime;
  provenance: { method?: string; artifactIds: string[] };
};

export type BeliefClaimLink = {
  id: string;
  beliefId: string;
  claimId: string;
  type: 'aligned' | 'diverges' | 'unknown';
  gap: number;
  asOf: ISODateTime;
  provenance: { method?: string };
};

export type NarrativeBeliefLink = {
  id: string;
  narrativeId: string;
  beliefId: string;
  type: 'expresses_as' | 'correlates_with' | 'hypothesized_influence';
  effectSize: number;
  asOf: ISODateTime;
  provenance: { method?: string; note: string };
};

export type DivergenceMetric = {
  id: string;
  narrativeId: string;
  claimId: string;
  divergenceScore: number;
  asOf: ISODateTime;
};

export type BeliefGapMetric = {
  id: string;
  cohortId: string;
  beliefId: string;
  claimId: string;
  gap: number;
  asOf: ISODateTime;
};
