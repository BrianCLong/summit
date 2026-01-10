// server/src/conductor/observability/anomaly-detector.ts
// Lightweight heuristics for detecting anomalous task IDs and diff patterns.

import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from './prometheus.js';

export interface AnomalySignal {
  type: 'task_id' | 'diff_pattern';
  reason: string;
  evidence: string;
  severity: 'info' | 'warning' | 'critical';
}

const highRiskTaskPrefixes = ['tmp-', 'test-', 'dev-', 'xx', 'sandbox'];
const suspiciousDiffTokens = [
  '-----BEGIN PRIVATE KEY-----',
  'AWS_SECRET_ACCESS_KEY',
  'x-api-key',
  'ghp_',
];
const maxDiffLength = 200_000;

export function detectTaskIdAnomalies(taskId: string): AnomalySignal[] {
  const signals: AnomalySignal[] = [];

  if (!taskId || taskId.length < 8) {
    signals.push({
      type: 'task_id',
      severity: 'critical',
      reason: 'Task ID too short to be trustworthy',
      evidence: taskId,
    });
  }

  if (highRiskTaskPrefixes.some((prefix) => taskId.startsWith(prefix))) {
    signals.push({
      type: 'task_id',
      severity: 'warning',
      reason: 'Non-production prefix detected',
      evidence: taskId,
    });
  }

  if (/[^a-zA-Z0-9\-:_]/.test(taskId)) {
    signals.push({
      type: 'task_id',
      severity: 'warning',
      reason: 'Unexpected characters present in task ID',
      evidence: taskId,
    });
  }

  if (/([a-zA-Z0-9])\1{5,}/.test(taskId)) {
    signals.push({
      type: 'task_id',
      severity: 'warning',
      reason: 'Repetitive characters may indicate generated or manipulated ID',
      evidence: taskId,
    });
  }

  recordSignals(signals, 'task');
  return signals;
}

export function detectDiffAnomalies(diff: string, context: string): AnomalySignal[] {
  const signals: AnomalySignal[] = [];
  const trimmedDiff =
    diff.length > maxDiffLength ? diff.slice(0, maxDiffLength) : diff;

  for (const token of suspiciousDiffTokens) {
    if (trimmedDiff.includes(token)) {
      signals.push({
        type: 'diff_pattern',
        severity: 'critical',
        reason: 'High risk token detected in diff',
        evidence: `${context}:${token}`,
      });
    }
  }

  if (/pin\s+version/i.test(trimmedDiff)) {
    signals.push({
      type: 'diff_pattern',
      severity: 'warning',
      reason: 'Dependency pinning detected',
      evidence: context,
    });
  }

  if (diff.length > maxDiffLength) {
    signals.push({
      type: 'diff_pattern',
      severity: 'info',
      reason: 'Diff truncated for anomaly scan',
      evidence: context,
    });
  }

  recordSignals(signals, 'diff');
  return signals;
}

function recordSignals(signals: AnomalySignal[], channel: 'task' | 'diff'): void {
  if (!signals.length) return;

  const mostSevere = signals.reduce<AnomalySignal['severity']>((acc, signal) => {
    const rank = { info: 0, warning: 1, critical: 2 };
    return rank[signal.severity] > rank[acc] ? signal.severity : acc;
  }, 'info');

  signals.forEach((signal) => {
    logger.warn('Anomaly detected', {
      channel,
      type: signal.type,
      severity: signal.severity,
      reason: signal.reason,
      evidence: maskEvidence(signal.evidence),
    });
  });

  try {
    prometheusConductorMetrics.recordOperationalEvent(
      'anomaly_detected',
      { channel, severity: mostSevere, count: signals.length },
    );
  } catch (error) {
    logger.warn('Failed to emit anomaly metric', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function maskEvidence(evidence: string): string {
  if (!evidence) return evidence;
  if (evidence.length <= 12) return evidence;
  return `${evidence.slice(0, 4)}…${evidence.slice(-4)}`;
}
