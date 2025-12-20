import { Counter, Gauge } from 'prom-client';
import { registry } from '../metrics/registry.js';

export const trustScoreGauge = new Gauge({
  name: 'intelgraph_trust_score',
  help: 'Current trust score per subject',
  labelNames: ['subject'],
  registers: [registry],
});

export const riskSignalsTotal = new Counter({
  name: 'intelgraph_risk_signals_total',
  help: 'Total risk signals raised',
  labelNames: ['tenant', 'kind', 'severity', 'source'],
  registers: [registry],
});

/**
 * Records the current trust score for a given subject.
 *
 * @param subjectId - The ID of the subject (e.g., user or entity) whose trust score is being recorded.
 * @param score - The numerical trust score value. Must be a finite number.
 */
export function recordTrustScore(subjectId: string, score: number) {
  if (Number.isFinite(score))
    trustScoreGauge.set({ subject: subjectId }, score);
}

/**
 * Records a risk signal event by incrementing the total count of risk signals.
 *
 * @param opts - The options for the risk signal.
 * @param opts.tenantId - The ID of the tenant associated with the signal.
 * @param opts.kind - The kind or type of the risk signal (e.g., 'fraud', 'anomaly').
 * @param opts.severity - The severity level of the risk signal (e.g., 'low', 'high').
 * @param opts.source - The source system or component that generated the signal.
 */
export function recordRiskSignal(opts: {
  tenantId: string;
  kind: string;
  severity: string;
  source: string;
}) {
  riskSignalsTotal.inc({
    tenant: opts.tenantId,
    kind: opts.kind,
    severity: opts.severity,
    source: opts.source,
  });
}
