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

export function recordTrustScore(subjectId: string, score: number) {
  if (Number.isFinite(score)) trustScoreGauge.set({ subject: subjectId }, score);
}

export function recordRiskSignal(opts: { tenantId: string; kind: string; severity: string; source: string }) {
  riskSignalsTotal.inc({ tenant: opts.tenantId, kind: opts.kind, severity: opts.severity, source: opts.source });
}

