#!/usr/bin/env node
/**
 * Risk Delta Score Calculator
 * Calculates quantitative 0-100 risk score from deception simulation results
 * Higher score = riskier changes
 */

const fs = require('fs');
const path = require('path');

function load(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const repodir = path.join(root, 'reports', 'deception');

// Load baseline and current simulation results
const base = load(path.join(repodir, 'baseline.json'));
const cur = load(path.join(repodir, 'current.json'));

// Normalize value between 0 and 1
function norm(v, max) {
  return Math.min(1, Math.max(0, v / max));
}

// Weighted risk factors
const w = {
  lat: 0.30, // Detection latency weight
  eva: 0.30, // Evasion rate weight
  fn: 0.25,  // False negatives weight
  br: 0.15   // Blast radius weight
};

// Calculate weighted risk score
const s = (
  w.lat * norm(cur.detection_latency_ms - base.detection_latency_ms, 5000) +
  w.eva * Math.max(0, cur.evasion_rate - base.evasion_rate) +
  w.fn * Math.max(0, cur.false_negatives - base.false_negatives) / Math.max(1, base.false_negatives + cur.false_negatives) +
  w.br * Math.max(0, cur.blast_radius_score - base.blast_radius_score)
);

const score = Math.round(100 * Math.min(1, s));

const summary = `
### Deception Simulation Risk Delta
- **Score:** ${score}/100 (higher = riskier)
- Baseline: ${base.run_id} → Current: ${cur.run_id}
- Factors: latency Δ=${cur.detection_latency_ms - base.detection_latency_ms}ms, evasion Δ=${(cur.evasion_rate - base.evasion_rate).toFixed(3)}
`;

console.log(summary.trim());
console.log(`RISK-DELTA:${score}`);
