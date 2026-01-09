#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import {
  ensureDir,
  loadPolicy,
  parseArgs,
  readJson,
  resolveTimestamp,
  toSlug,
  writeJson,
} from './stabilization-utils.mjs';

const DEFAULT_OUT_DIR = 'artifacts/stabilization/roadmap-handoff';
const DEFAULT_RETRO_PATH = 'artifacts/stabilization/retrospective/retro_latest.json';

function computeAverage(values) {
  const valid = values.filter((value) => value !== null && value !== undefined);
  if (!valid.length) {
    return null;
  }
  const sum = valid.reduce((acc, value) => acc + value, 0);
  return sum / valid.length;
}

function countWeeks(values, predicate) {
  return values.reduce((acc, value) => acc + (predicate(value) ? 1 : 0), 0);
}

function buildCandidate({ slug, title, reason, severity, persistence, evidence }) {
  return {
    slug,
    title,
    reason,
    severity,
    persistence,
    evidence,
    marker: `<!-- stabilization-roadmap:${slug} -->`,
  };
}

function deriveCandidates(retro, policy) {
  const thresholds = policy.stabilization_roadmap_handoff.thresholds;
  const weeks = retro.weeks || [];
  const riskValues = weeks.map((week) => week.metrics.risk_index);
  const evidenceValues = weeks.map((week) => week.metrics.evidence_compliance);
  const overdueValues = weeks.map((week) => week.metrics.overdue_load);
  const blockedValues = weeks.map((week) => {
    const raw = week.metrics.blocked_unissued;
    if (raw === null || raw === undefined) {
      return null;
    }
    if (typeof raw === 'number') {
      return raw;
    }
    if (typeof raw === 'object') {
      return Number(raw.p0 ?? raw.total ?? raw.count ?? 0);
    }
    return Number(raw);
  });

  const candidates = [];

  const blockedWeeks = countWeeks(blockedValues, (value) =>
    value !== null && value >= thresholds.blocked_unissued_p0_min,
  );
  if (blockedWeeks >= 1) {
    candidates.push(
      buildCandidate({
        slug: 'issuance-hygiene',
        title: 'Issuance hygiene reinforcement',
        reason: `${blockedWeeks} week(s) with blocked unissued P0 items`,
        severity: Math.min(100, blockedWeeks * 25),
        persistence: blockedWeeks,
        evidence: { blocked_unissued_weeks: blockedWeeks },
      }),
    );
  }

  const evidenceBreaches = countWeeks(
    evidenceValues,
    (value) => value !== null && value < thresholds.evidence_compliance_min,
  );
  if (evidenceBreaches >= thresholds.recurring_overdue_weeks) {
    const minEvidence = Math.min(...evidenceValues.filter((v) => v !== null));
    const gap = thresholds.evidence_compliance_min - minEvidence;
    candidates.push(
      buildCandidate({
        slug: 'evidence-compliance',
        title: 'Evidence compliance recovery',
        reason: `${evidenceBreaches} week(s) below ${thresholds.evidence_compliance_min}`,
        severity: Math.min(100, Math.round(gap * 100)),
        persistence: evidenceBreaches,
        evidence: { evidence_breach_weeks: evidenceBreaches, min_evidence: minEvidence },
      }),
    );
  }

  const overdueWeeks = countWeeks(
    overdueValues,
    (value) => value !== null && value >= thresholds.overdue_load_p0_min,
  );
  if (overdueWeeks >= thresholds.recurring_overdue_weeks) {
    candidates.push(
      buildCandidate({
        slug: 'p0-sla-adherence',
        title: 'P0 SLA adherence',
        reason: `${overdueWeeks} week(s) with overdue P0 load`,
        severity: Math.min(100, overdueWeeks * 20),
        persistence: overdueWeeks,
        evidence: { overdue_weeks: overdueWeeks },
      }),
    );
  }

  const riskAverage = computeAverage(riskValues);
  if (riskAverage !== null && riskAverage >= thresholds.min_risk_index_avg) {
    candidates.push(
      buildCandidate({
        slug: 'systemic-risk-reduction',
        title: 'Systemic risk reduction',
        reason: `risk_index average ${riskAverage.toFixed(1)} ≥ ${thresholds.min_risk_index_avg}`,
        severity: Math.min(100, Math.round(riskAverage)),
        persistence: riskValues.filter((value) => value !== null).length,
        evidence: { risk_index_avg: riskAverage },
      }),
    );
  }

  if (retro.metrics_series?.ci_okr_at_risk) {
    candidates.push(
      buildCandidate({
        slug: 'ci-gate-stability',
        title: 'CI gate stability',
        reason: 'CI OKR flagged at risk in retrospective inputs',
        severity: 60,
        persistence: 1,
        evidence: { ci_okr_at_risk: true },
      }),
    );
  }

  return candidates.map((candidate) => ({
    ...candidate,
    slug: toSlug(candidate.slug),
  }));
}

function sortCandidates(candidates) {
  return candidates.sort((a, b) => {
    if (b.severity !== a.severity) {
      return b.severity - a.severity;
    }
    if (b.persistence !== a.persistence) {
      return b.persistence - a.persistence;
    }
    return a.slug.localeCompare(b.slug);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/releases/derive_stabilization_roadmap_candidates.mjs [options]

Options:
  --retro <path>    Retrospective JSON path
  --out-dir <dir>   Output directory (default: ${DEFAULT_OUT_DIR})
  --policy <path>   Policy YAML path
  --timestamp <ts>  Override timestamp token
`);
    process.exit(0);
  }

  const policy = await loadPolicy(args.policy);
  if (!policy.stabilization_roadmap_handoff.enabled) {
    console.log('Stabilization roadmap handoff disabled by policy.');
    return;
  }

  const retroPath = args.retro || DEFAULT_RETRO_PATH;
  const retro = await readJson(retroPath);
  const candidates = deriveCandidates(retro, policy);

  const maxCandidates = policy.stabilization_roadmap_handoff.max_candidates || 5;
  const selected = sortCandidates(candidates).slice(0, maxCandidates);

  const timestamp = resolveTimestamp(args.timestamp);
  const outDir = args['out-dir'] || DEFAULT_OUT_DIR;
  await ensureDir(outDir);

  const output = {
    generated_at: new Date().toISOString(),
    retro_path: retroPath,
    window_weeks: retro.window_weeks,
    candidates: selected,
  };

  const outputPath = path.join(outDir, `candidates_${timestamp}.json`);
  await writeJson(outputPath, output);

  const latestPath = path.join(outDir, 'candidates_latest.json');
  await writeJson(latestPath, output);

  console.log(`Roadmap candidates written to ${outputPath}`);
}

await main();
