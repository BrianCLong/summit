import { SignedResultBundle } from './sign-result';

export interface LeaderboardEntry {
  model: string;
  score: number;
  timestamp: string;
  metadata: Record<string, any>;
}

export function aggregateScores(bundles: SignedResultBundle[]): LeaderboardEntry[] {
  return bundles.map(bundle => {
    // Assuming metric "overall_score" or extracting average of metrics
    let score = 0;
    if (bundle.metrics && typeof bundle.metrics.overall_score === 'number') {
      score = bundle.metrics.overall_score;
    } else if (bundle.metrics) {
      const values = Object.values(bundle.metrics).filter(v => typeof v === 'number') as number[];
      if (values.length > 0) {
        score = values.reduce((sum, v) => sum + v, 0) / values.length;
      }
    }

    return {
      model: bundle.report.model || 'unknown',
      score,
      timestamp: bundle.stamp.timestamp || new Date().toISOString(),
      metadata: {
        protocolVersion: bundle.protocolVersion,
        benchmarkVersion: bundle.benchmarkVersion
      }
    };
  }).sort((a, b) => b.score - a.score);
}

export function generateLeaderboardJSON(bundles: SignedResultBundle[]): string {
  const entries = aggregateScores(bundles);
  return JSON.stringify({
    lastUpdated: new Date().toISOString(),
    entries
  }, null, 2);
}
