export type LaneBadge =
  | "CANDIDATE"
  | "OBSERVED"
  | "TRUSTED"
  | "PROMOTED";

export type LaneCitation = {
  sourceId: string;
  title?: string;
  lane: LaneBadge;
  trustScore?: number;
  confidenceScore?: number;
  attested?: boolean;
  collector?: string;
  snippet?: string;
};

export type SynthesizedClaimStrength =
  | "CANONICAL"
  | "STRONG"
  | "PROVISIONAL"
  | "PRELIMINARY";

export type SynthesizedClaim = {
  text: string;
  strength: SynthesizedClaimStrength;
  citations: LaneCitation[];
  refusal?: {
    shouldRefuseCanonicalTone: boolean;
    reason?: string;
  };
};

export type AnswerSynthesisResult = {
  summary: string;
  claims: SynthesizedClaim[];
  overallMode: "CANONICAL" | "CAUTIOUS" | "PRELIMINARY";
};
