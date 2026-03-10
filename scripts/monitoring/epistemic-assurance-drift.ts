import * as fs from 'fs';
import * as crypto from 'crypto';

interface Metrics {
  timestamp: string;
  totalDecisions: number;
  approved: number;
  blocked: number;
  escalated: number;
  degraded: number;
  averageSupportScore: number;
  averageConflictScore: number;
}

export function detectDrift(currentMetrics: Metrics, historicalMetrics: Metrics[]): string[] {
  const alerts: string[] = [];

  // Baseline calculations
  if (historicalMetrics.length === 0) return alerts;

  let totalHistoricalDecisions = 0;
  let totalApprovedHistorical = 0;
  let totalSupportScoreHistorical = 0;

  for (const m of historicalMetrics) {
      if (m.totalDecisions > 0) {
          totalHistoricalDecisions += m.totalDecisions;
          totalApprovedHistorical += m.approved;
          totalSupportScoreHistorical += (m.averageSupportScore * m.totalDecisions); // Weighted average
      }
  }

  if (totalHistoricalDecisions === 0 || currentMetrics.totalDecisions === 0) return alerts;

  const avgApprovedHistorical = totalApprovedHistorical / totalHistoricalDecisions;
  const currentApprovalRate = currentMetrics.approved / currentMetrics.totalDecisions;

  if (Math.abs(currentApprovalRate - avgApprovedHistorical) > 0.15) {
    alerts.push(`Approval rate drifted significantly: current ${currentApprovalRate.toFixed(2)}, historical ${avgApprovedHistorical.toFixed(2)}`);
  }

  const avgSupportHistorical = totalSupportScoreHistorical / totalHistoricalDecisions;
  if (Math.abs(currentMetrics.averageSupportScore - avgSupportHistorical) > 0.1) {
    alerts.push(`Support score drifted: current ${currentMetrics.averageSupportScore.toFixed(2)}, historical ${avgSupportHistorical.toFixed(2)}`);
  }

  return alerts;
}

// Write deterministic metrics artifact
export function writeMetrics(metrics: Metrics, path: string = 'metrics.json'): void {
    const { timestamp, ...deterministicMetrics } = metrics;

    fs.writeFileSync(path, JSON.stringify(deterministicMetrics, null, 2));
}

export function writeReport(report: any, path: string = 'report.json'): void {
    fs.writeFileSync(path, JSON.stringify(report, null, 2));
}

export function writeStamp(evidenceBundle: any, path: string = 'stamp.json'): void {
    const hash = crypto.createHash('sha256').update(JSON.stringify(evidenceBundle)).digest('hex');
    fs.writeFileSync(path, JSON.stringify({ hash, bundle: evidenceBundle }, null, 2));
}
