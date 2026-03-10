import { TrustScore } from "../schema/trustScore";

export function scoreEvidenceTrust(input: {
  citationVerified: boolean;
  sourceReputation: number;
  freshnessDays?: number;
  contradictionCount?: number;
}): TrustScore {
  const base = input.citationVerified ? 0.5 : 0.1;
  const score =
    base +
    Math.min(0.3, input.sourceReputation) -
    Math.min(0.2, (input.contradictionCount ?? 0) * 0.05);

  return {
    score: Math.max(0, Math.min(1, score)),
    reasons: [],
    modelVersion: "sep-trust-v1",
  };
}
