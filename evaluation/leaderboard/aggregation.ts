import { EvidenceScore, aggregateScores } from '../scoring/evidence';

export interface LeaderboardEntry {
  model: string;
  version: string;
  aggregateScore: number;
  evidencePrecision: number;
  evidenceRecall: number;
  evidenceF1: number;
  latencyAvg: number;
  costTotal: number;
}

export interface PublishableLeaderboard {
  timestamp: string;
  benchmarkVersion: string;
  entries: LeaderboardEntry[];
}

export function generateLeaderboard(results: any[]): PublishableLeaderboard {
  const entries: LeaderboardEntry[] = results.map(result => {
    // Assuming result.metrics and result.report exist
    const metrics = result.metrics || {};
    const report = result.report || {};

    // Calculate evidence scores if present, else default
    const evidenceScores: EvidenceScore[] = report.evidenceScores || [];
    const aggregatedEvidence = aggregateScores(evidenceScores);

    return {
      model: result.model || 'unknown',
      version: result.version || 'unknown',
      aggregateScore: report.aggregateScore || 0,
      evidencePrecision: aggregatedEvidence.precision,
      evidenceRecall: aggregatedEvidence.recall,
      evidenceF1: aggregatedEvidence.f1_score || 0,
      latencyAvg: metrics.latencyAvg || 0,
      costTotal: metrics.costTotal || 0,
    };
  });

  // Sort entries by aggregateScore descending
  entries.sort((a, b) => b.aggregateScore - a.aggregateScore);

  return {
    timestamp: new Date().toISOString(),
    benchmarkVersion: results[0]?.benchmarkVersion || '1.0.0', // Take from first result or default
    entries
  };
}
