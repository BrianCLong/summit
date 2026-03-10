import type { DoctrineAlert } from "../alerts/alertTypes";
import type { ServedRecommendation } from "./advisorTypes";

export function fallbackRecommendations(
  alert: DoctrineAlert
): ServedRecommendation[] {
  const family = alert.related_entities?.family_code;

  const out: ServedRecommendation[] = [];

  if (alert.category === "family_brittleness" && family) {
    out.push({
      rank: 1,
      action_type: "tighten_family_policy",
      confidence: "low",
      scope_match: {
        alert_category_match: true,
        family_match: true,
        severity_match: true,
      },
      evidence: {
        samples: 0,
        avg_score: 0,
        effective_rate: 0,
        clear_rate: 0,
        recurrence_rate: 0,
      },
      rationale:
        `Fallback recommendation: tighten family policy for ${family} because the alert is family-scoped and no stronger playbook evidence exists yet.`,
      known_side_effects: ["may overblock benign variants until more outcomes accumulate"],
    });
  }

  if (alert.category === "posture_sensitivity") {
    out.push({
      rank: out.length + 1,
      action_type: "reduce_global_bias",
      confidence: "low",
      scope_match: {
        alert_category_match: true,
        family_match: false,
        severity_match: true,
      },
      evidence: {
        samples: 0,
        avg_score: 0,
        effective_rate: 0,
        clear_rate: 0,
        recurrence_rate: 0,
      },
      rationale:
        "Fallback recommendation: reduce global bias for posture-sensitivity alerts when no stronger playbook match is available.",
      known_side_effects: ["may shift risk into family- or instance-level brittleness"],
    });
  }

  out.push({
    rank: out.length + 1,
    action_type: "collect_more_outcomes",
    confidence: "low",
    scope_match: {
      alert_category_match: false,
      family_match: false,
      severity_match: false,
    },
    evidence: {
      samples: 0,
      avg_score: 0,
      effective_rate: 0,
      clear_rate: 0,
      recurrence_rate: 0,
    },
    rationale:
      "Fallback recommendation: collect more outcomes before making a larger doctrine change.",
    known_side_effects: ["slower intervention"],
  });

  return out.slice(0, 3);
}
