import type { DoctrineAlert } from "../alerts/alertTypes";
import type { PlaybookStat } from "../playbook/playbookTypes";
import type { AlertRecommendationResponse, ServedRecommendation } from "./advisorTypes";
import { scorePlaybookCandidates } from "./recommendationScoring";
import { fallbackRecommendations } from "./recommendationFallbacks";

function confidenceFromSamplesAndScore(
  samples: number,
  avgScore: number
): "low" | "medium" | "high" {
  if (samples >= 8 && avgScore >= 0.35) return "high";
  if (samples >= 4 && avgScore >= 0.10) return "medium";
  return "low";
}

export function serveAlertRecommendations(args: {
  alert: DoctrineAlert;
  stats: PlaybookStat[];
}): AlertRecommendationResponse {
  const { alert, stats } = args;

  const ranked = scorePlaybookCandidates(alert, stats)
    .filter((x) => x.score > 0.05)
    .slice(0, 5)
    .map<ServedRecommendation>((x, i) => ({
      rank: i + 1,
      action_type: x.stat.action_type as ServedRecommendation["action_type"],
      confidence: confidenceFromSamplesAndScore(x.stat.samples, x.stat.avg_score),
      scope_match: x.scope_match,
      evidence: {
        samples: x.stat.samples,
        avg_score: x.stat.avg_score,
        effective_rate: x.stat.effective_rate,
        clear_rate: x.stat.clear_rate,
        recurrence_rate: x.stat.recurrence_rate,
      },
      rationale:
        `Recommended because it matches the alert scope and has observed playbook performance: ` +
        `avg score ${x.stat.avg_score.toFixed(2)}, effective ${(x.stat.effective_rate * 100).toFixed(0)}%, ` +
        `recur ${(x.stat.recurrence_rate * 100).toFixed(0)}%.`,
      known_side_effects: x.stat.side_effect_flags,
    }));

  const fallback_used = ranked.length === 0;
  const recommendations = fallback_used
    ? fallbackRecommendations(alert)
    : ranked;

  const summary = fallback_used
    ? "No strong playbook evidence was found; serving fallback doctrine recommendations."
    : "Serving top-ranked doctrine recommendations from historical remediation performance.";

  return {
    alert_id: alert.alert_id,
    generated_at: new Date().toISOString(),
    recommendations,
    fallback_used,
    summary,
  };
}
