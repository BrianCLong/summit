import type {
  BehaviorInsight,
  CorrelatedFinding,
  PatternMatch,
  ThreatScore,
  ThreatSeverity,
} from './types';

function severityFromScore(score: number): ThreatSeverity {
  if (score >= 0.85) return 'critical';
  if (score >= 0.7) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.3) return 'low';
  return 'info';
}

export class ThreatScorer {
  score(
    entityId: string,
    behavior?: BehaviorInsight,
    patterns: PatternMatch[] = [],
    correlation?: CorrelatedFinding,
    ruleHits: string[] = [],
  ): ThreatScore {
    const behaviorScore = behavior?.score ?? 0;
    const patternScore = patterns.reduce((sum, pattern) => sum + pattern.weight, 0);
    const intelScore = correlation?.strength ?? 0;
    const ruleBoost = ruleHits.length > 0 ? 0.2 : 0;

    const composite = Math.min(behaviorScore * 0.4 + patternScore * 0.3 + intelScore * 0.2 + ruleBoost, 1);
    const severity = severityFromScore(composite);
    const notes = [
      `behavior=${behaviorScore.toFixed(2)}`,
      `patterns=${patternScore.toFixed(2)}`,
      `intel=${intelScore.toFixed(2)}`,
      `rules=${ruleHits.join(',') || 'none'}`,
    ];

    return {
      entityId,
      score: Number(composite.toFixed(2)),
      severity,
      components: {
        behavior: Number(behaviorScore.toFixed(2)),
        pattern: Number(patternScore.toFixed(2)),
        intel: Number(intelScore.toFixed(2)),
        rules: ruleBoost,
      },
      notes,
    } satisfies ThreatScore;
  }
}
