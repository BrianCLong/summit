import type { RetrievalResponse } from "../retrieval/types";
import type { AnswerSynthesisResult, LaneCitation, SynthesizedClaim } from "./types";
import { prefixForLane, strengthForLane, wordingRuleForLane } from "./languagePolicy";
import { shouldRefuseCanonicalTone } from "./refusalPolicy";

function bestLane(citations: LaneCitation[]): LaneCitation["lane"] {
  const order = ["PROMOTED", "TRUSTED", "OBSERVED", "CANDIDATE"] as const;
  for (const lane of order) {
    if (citations.some((c) => c.lane === lane)) return lane;
  }
  return "CANDIDATE";
}

function summarizeOverallMode(claims: SynthesizedClaim[]): AnswerSynthesisResult["overallMode"] {
  if (claims.every((c) => c.strength === "CANONICAL")) return "CANONICAL";
  if (claims.some((c) => c.strength === "PRELIMINARY")) return "PRELIMINARY";
  return "CAUTIOUS";
}

export function synthesizeLaneAwareAnswer(resp: RetrievalResponse): AnswerSynthesisResult {
  const claims: SynthesizedClaim[] = resp.hits.map((hit) => {
    const citations: LaneCitation[] = [
      {
        sourceId: hit.id,
        lane: hit.provenance.lane as any,
        trustScore: hit.provenance.trustScore,
        confidenceScore: hit.provenance.confidenceScore,
        attested: hit.provenance.attested,
        collector: hit.provenance.collector
      }
    ];

    const lane = bestLane(citations);
    const strength = strengthForLane(lane);
    const rule = wordingRuleForLane(lane);
    const refusal = shouldRefuseCanonicalTone(citations);

    const label =
      typeof hit.payload.label === "string"
        ? hit.payload.label
        : typeof hit.payload.proposition === "string"
        ? hit.payload.proposition
        : `${hit.entityType} ${hit.id}`;

    const text = `${prefixForLane(lane)} ${label} ${rule.verb} relevant evidence in this lane-scoped retrieval set.`;

    return {
      text,
      strength,
      citations,
      refusal: {
        shouldRefuseCanonicalTone: refusal.shouldRefuse,
        reason: refusal.reason
      }
    };
  });

  const overallMode = summarizeOverallMode(claims);

  const summary =
    overallMode === "CANONICAL"
      ? "Results are supported by promoted-lane material."
      : overallMode === "CAUTIOUS"
      ? "Results include strong support, but some claims remain below canonical promotion."
      : "Results are preliminary and should not be treated as canonical without further promotion.";

  return {
    summary,
    claims,
    overallMode
  };
}
