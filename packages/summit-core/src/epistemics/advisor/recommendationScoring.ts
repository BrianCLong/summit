import type { DoctrineAlert } from "../alerts/alertTypes";
import type { PlaybookStat } from "../playbook/playbookTypes";

export type ScoredPlaybookCandidate = {
  stat: PlaybookStat;
  score: number;
  scope_match: {
    alert_category_match: boolean;
    family_match: boolean;
    severity_match: boolean;
  };
};

export function scorePlaybookCandidates(
  alert: DoctrineAlert,
  stats: PlaybookStat[]
): ScoredPlaybookCandidate[] {
  const family = alert.related_entities?.family_code;
  const category = alert.category;
  const severity = alert.severity;

  const scored = stats.map((s) => {
    const alert_category_match = s.alert_category === category;
    const family_match = family != null && s.target_family_code === family;
    const severity_match = s.severity === severity;

    let score = 0;

    if (alert_category_match) score += 0.35;
    if (family_match) score += 0.35;
    if (severity_match) score += 0.15;

    score += Math.max(-0.3, Math.min(0.3, s.avg_score * 0.3));
    score += Math.max(0, Math.min(0.15, s.effective_rate * 0.15));
    score -= Math.max(0, Math.min(0.15, s.recurrence_rate * 0.15));

    if (s.samples >= 8) score += 0.08;
    else if (s.samples >= 4) score += 0.04;

    return {
      stat: s,
      score,
      scope_match: {
        alert_category_match,
        family_match,
        severity_match,
      },
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}
