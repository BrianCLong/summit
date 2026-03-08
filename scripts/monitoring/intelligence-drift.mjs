#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function percentileBuckets(scores) {
  if (scores.length === 0) {
    return { p25: 0, p50: 0, p75: 0, p90: 0 };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return { p25: at(0.25), p50: at(0.5), p75: at(0.75), p90: at(0.9) };
}

function main() {
  const insiderRisk = readJson('artifacts/insider-risk-report.json');
  const provenance = readJson('artifacts/provenance-report.json');

  const anomalyRate = typeof insiderRisk.anomaly_rate === 'number' ? insiderRisk.anomaly_rate : null;
  const trend = insiderRisk.risk_trend ?? 'stable';
  const trustScores = Array.isArray(provenance.trust_scores)
    ? provenance.trust_scores.filter((v) => typeof v === 'number')
    : [];

  const report = {
    generated_at: new Date().toISOString(),
    anomaly_rate: anomalyRate,
    insider_risk_trend: trend,
    trust_score_distribution: percentileBuckets(trustScores),
  };

  writeFileSync('artifacts/drift-report.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

main();
