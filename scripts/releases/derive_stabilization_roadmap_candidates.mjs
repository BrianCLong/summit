#!/usr/bin/env node
/**
 * derive_stabilization_roadmap_candidates.mjs
 *
 * Derives roadmap candidates from stabilization retrospective data using rule-based triggers.
 * Scores candidates by severity and persistence, then selects the top N for handoff.
 *
 * Usage:
 *   node scripts/releases/derive_stabilization_roadmap_candidates.mjs [OPTIONS]
 *
 * Options:
 *   --retro=PATH        Path to retrospective JSON (required)
 *   --policy=PATH       Path to policy YAML (optional)
 *   --max-candidates=N  Maximum candidates to emit (default: 5)
 *   --out-file=PATH     Output file (default: stdout)
 *   --help              Show this help message
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '../..');

// Default policy thresholds
const DEFAULT_POLICY = {
  stabilization_roadmap_handoff: {
    enabled: true,
    mode: 'draft',
    max_candidates: 5,
    thresholds: {
      recurring_overdue_weeks: 2,
      min_risk_index_avg: 30,
      evidence_compliance_min: 0.95,
      blocked_unissued_p0_threshold: 0,
      overdue_p0_threshold: 0,
      on_time_rate_min: 0.80
    }
  }
};

// Parse CLI arguments
function parseArgs() {
  const args = {
    retro: null,
    policy: null,
    maxCandidates: 5,
    outFile: null,
    help: false
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--help') {
      args.help = true;
    } else if (arg.startsWith('--retro=')) {
      args.retro = arg.split('=')[1];
    } else if (arg.startsWith('--policy=')) {
      args.policy = arg.split('=')[1];
    } else if (arg.startsWith('--max-candidates=')) {
      args.maxCandidates = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--out-file=')) {
      args.outFile = arg.split('=')[1];
    }
  }

  return args;
}

// Load policy configuration
async function loadPolicy(policyPath) {
  if (!policyPath) {
    return DEFAULT_POLICY.stabilization_roadmap_handoff;
  }

  try {
    const content = await readFile(policyPath, 'utf-8');
    // Simple YAML parsing for our use case (or use a YAML library)
    // For now, return defaults
    return DEFAULT_POLICY.stabilization_roadmap_handoff;
  } catch (err) {
    console.warn(`Could not load policy from ${policyPath}, using defaults`);
    return DEFAULT_POLICY.stabilization_roadmap_handoff;
  }
}

// Rule-based trigger evaluation
function evaluateTriggers(retro, policy) {
  const candidates = [];
  const { thresholds } = policy;

  // Extract key metrics from retrospective
  const lastWeek = retro.weekly_data[retro.weekly_data.length - 1];
  const weekCount = retro.window.weeks;

  // Calculate averages
  const avgRiskIndex = average(retro.series.risk_index);
  const avgEvidenceCompliance = average(retro.series.evidence_compliance);
  const avgOnTimeRate = average(retro.series.on_time_rate);

  // Count weeks with issues
  const weeksWithBlockedUnissuedP0 = retro.series.blocked_unissued_p0.filter(v => v > thresholds.blocked_unissued_p0_threshold).length;
  const weeksWithOverdueP0 = retro.series.overdue_p0.filter(v => v > thresholds.overdue_p0_threshold).length;
  const weeksWithLowEvidence = retro.series.evidence_compliance.filter(v => v < thresholds.evidence_compliance_min).length;

  // TRIGGER 1: Issuance Hygiene
  if (weeksWithBlockedUnissuedP0 >= 1 || lastWeek.metrics?.blocked_unissued > 0) {
    candidates.push({
      slug: 'issuance-hygiene',
      title: 'Issuance Hygiene Improvements',
      category: 'process',
      severity: lastWeek.metrics?.blocked_unissued_p0 > 0 ? 'critical' : 'high',
      persistence: weeksWithBlockedUnissuedP0,
      score: calculateScore('critical', weeksWithBlockedUnissuedP0),
      trigger: 'blocked_unissued_p0 > 0',
      evidence: {
        weeks_affected: weeksWithBlockedUnissuedP0,
        total_weeks: weekCount,
        latest_value: lastWeek.metrics?.blocked_unissued_p0 || 0,
        metric: 'blocked_unissued_p0'
      }
    });
  }

  // TRIGGER 2: Evidence Compliance
  if (weeksWithLowEvidence >= thresholds.recurring_overdue_weeks || avgEvidenceCompliance < thresholds.evidence_compliance_min) {
    candidates.push({
      slug: 'evidence-compliance',
      title: 'Evidence Collection & Compliance',
      category: 'governance',
      severity: avgEvidenceCompliance < 0.90 ? 'high' : 'medium',
      persistence: weeksWithLowEvidence,
      score: calculateScore(avgEvidenceCompliance < 0.90 ? 'high' : 'medium', weeksWithLowEvidence),
      trigger: `evidence_compliance < ${thresholds.evidence_compliance_min}`,
      evidence: {
        weeks_affected: weeksWithLowEvidence,
        total_weeks: weekCount,
        average_compliance: avgEvidenceCompliance,
        target: thresholds.evidence_compliance_min,
        metric: 'evidence_compliance'
      }
    });
  }

  // TRIGGER 3: P0 SLA Adherence
  if (weeksWithOverdueP0 >= thresholds.recurring_overdue_weeks) {
    candidates.push({
      slug: 'p0-sla-adherence',
      title: 'P0 SLA Adherence',
      category: 'process',
      severity: 'critical',
      persistence: weeksWithOverdueP0,
      score: calculateScore('critical', weeksWithOverdueP0),
      trigger: `overdue_p0 > 0 in >=${thresholds.recurring_overdue_weeks} weeks`,
      evidence: {
        weeks_affected: weeksWithOverdueP0,
        total_weeks: weekCount,
        latest_value: lastWeek.metrics?.overdue_p0 || 0,
        metric: 'overdue_p0'
      }
    });
  }

  // TRIGGER 4: Systemic Risk Reduction
  if (avgRiskIndex >= thresholds.min_risk_index_avg) {
    const trend = retro.trends.risk_index?.trend || 'stable';
    candidates.push({
      slug: 'systemic-risk-reduction',
      title: 'Systemic Risk Reduction',
      category: 'technical',
      severity: avgRiskIndex >= 40 ? 'critical' : 'high',
      persistence: weekCount, // Affects all weeks
      score: calculateScore(avgRiskIndex >= 40 ? 'critical' : 'high', weekCount),
      trigger: `risk_index_avg >= ${thresholds.min_risk_index_avg}`,
      evidence: {
        average_risk_index: avgRiskIndex,
        trend: trend,
        threshold: thresholds.min_risk_index_avg,
        latest_value: lastWeek.metrics?.risk_index || 0,
        metric: 'risk_index'
      }
    });
  }

  // TRIGGER 5: On-Time Delivery
  if (avgOnTimeRate < thresholds.on_time_rate_min) {
    candidates.push({
      slug: 'on-time-delivery',
      title: 'On-Time Delivery Improvements',
      category: 'process',
      severity: avgOnTimeRate < 0.70 ? 'high' : 'medium',
      persistence: retro.series.on_time_rate.filter(v => v < thresholds.on_time_rate_min).length,
      score: calculateScore(avgOnTimeRate < 0.70 ? 'high' : 'medium', weekCount),
      trigger: `on_time_rate < ${thresholds.on_time_rate_min}`,
      evidence: {
        average_on_time_rate: avgOnTimeRate,
        target: thresholds.on_time_rate_min,
        latest_value: lastWeek.metrics?.on_time_rate || 0,
        metric: 'on_time_rate'
      }
    });
  }

  // TRIGGER 6: CI Gate Stability (optional, based on recurring blockers)
  const ciBlockers = retro.recurring_blockers.filter(b =>
    b.issue.includes('ci') || b.issue.includes('gate')
  );
  if (ciBlockers.length > 0) {
    candidates.push({
      slug: 'ci-gate-stability',
      title: 'CI/CD Gate Stability',
      category: 'infrastructure',
      severity: 'medium',
      persistence: ciBlockers[0].weeks,
      score: calculateScore('medium', ciBlockers[0].weeks),
      trigger: 'recurring CI/CD gate failures',
      evidence: {
        recurring_issues: ciBlockers.map(b => b.issue),
        weeks_affected: ciBlockers[0].weeks,
        metric: 'ci_stability'
      }
    });
  }

  return candidates;
}

// Calculate candidate score (higher = more urgent)
function calculateScore(severity, persistence) {
  const severityWeight = {
    critical: 100,
    high: 70,
    medium: 40,
    low: 20
  };

  const baseScore = severityWeight[severity] || 20;
  const persistenceBonus = persistence * 10;

  return baseScore + persistenceBonus;
}

// Helper: Calculate average
function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

// Select top N candidates
function selectTopCandidates(candidates, maxCandidates) {
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates);
}

// Main function
async function main() {
  const args = parseArgs();

  if (args.help) {
    console.log(`
Usage: node scripts/releases/derive_stabilization_roadmap_candidates.mjs [OPTIONS]

Options:
  --retro=PATH        Path to retrospective JSON (required)
  --policy=PATH       Path to policy YAML (optional)
  --max-candidates=N  Maximum candidates to emit (default: 5)
  --out-file=PATH     Output file (default: stdout)
  --help              Show this help message

Description:
  Derives roadmap candidates from stabilization retrospective data using rule-based triggers.
  Scores candidates by severity and persistence, then selects the top N for handoff.
    `);
    return;
  }

  if (!args.retro) {
    console.error('Error: --retro=PATH is required');
    process.exit(1);
  }

  console.log('Deriving Roadmap Candidates...');
  console.log(`  Retrospective: ${args.retro}`);

  // Load retrospective data
  const retroContent = await readFile(args.retro, 'utf-8');
  const retro = JSON.parse(retroContent);

  // Load policy
  const policy = await loadPolicy(args.policy);
  const maxCandidates = args.maxCandidates || policy.max_candidates || 5;

  console.log(`  Max Candidates: ${maxCandidates}`);

  // Evaluate triggers
  const allCandidates = evaluateTriggers(retro, policy);
  console.log(`  Triggered: ${allCandidates.length} candidates`);

  // Select top candidates
  const selectedCandidates = selectTopCandidates(allCandidates, maxCandidates);

  const output = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    retrospective: {
      path: args.retro,
      window: retro.window
    },
    policy: {
      max_candidates: maxCandidates,
      thresholds: policy.thresholds
    },
    candidates: selectedCandidates,
    all_triggered: allCandidates.map(c => ({
      slug: c.slug,
      title: c.title,
      score: c.score,
      severity: c.severity
    }))
  };

  // Output
  const outputJson = JSON.stringify(output, null, 2);

  if (args.outFile) {
    await writeFile(args.outFile, outputJson, 'utf-8');
    console.log(`\n✅ Candidates written to: ${args.outFile}`);
  } else {
    console.log('\n' + outputJson);
  }

  console.log(`\nSelected Candidates:`);
  for (const candidate of selectedCandidates) {
    console.log(`  - ${candidate.slug} (${candidate.severity}, score: ${candidate.score})`);
  }
}

main().catch(err => {
  console.error('Error deriving candidates:', err);
  process.exit(1);
});
