import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const [key, rawValue] = arg.slice(2).split('=');
    if (rawValue !== undefined) {
      args[key] = rawValue;
    } else {
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function countWeeks(series, predicate) {
  return series.filter((entry) => predicate(entry)).length;
}

function buildCandidate({ slug, title, reason, weeksTriggered, severity, areaLabel }) {
  return {
    slug,
    title,
    reason,
    weeks_triggered: weeksTriggered,
    severity,
    area_label: areaLabel,
  };
}

function calculateSeverity({ weeksTriggered, magnitude }) {
  return Number((weeksTriggered * 10 + magnitude * 5).toFixed(2));
}

export function deriveCandidates({ retrospective, policy }) {
  const series = retrospective.metrics.series || [];
  const thresholds = policy.thresholds || {};
  const candidates = [];

  const blockedWeeks = countWeeks(series, (entry) => (entry.blocked_unissued || 0) > 0);
  if (blockedWeeks >= 1) {
    const magnitude = Math.max(...series.map((entry) => entry.blocked_unissued || 0));
    candidates.push(
      buildCandidate({
        slug: 'issuance-hygiene',
        title: 'Issuance hygiene enforcement',
        reason: `blocked_unissued > 0 in ${blockedWeeks} week(s).`,
        weeksTriggered: blockedWeeks,
        severity: calculateSeverity({ weeksTriggered: blockedWeeks, magnitude }),
        areaLabel: 'release',
      }),
    );
  }

  const evidenceMin = thresholds.evidence_compliance_min ?? 0.95;
  const evidenceWeeks = countWeeks(
    series,
    (entry) => typeof entry.evidence_compliance === 'number' && entry.evidence_compliance < evidenceMin,
  );
  if (evidenceWeeks >= (thresholds.recurring_overdue_weeks ?? 2)) {
    const magnitude = evidenceMin - Math.min(...series.map((entry) => entry.evidence_compliance || 1));
    candidates.push(
      buildCandidate({
        slug: 'evidence-compliance',
        title: 'Evidence compliance recovery',
        reason: `evidence_compliance < ${evidenceMin} in ${evidenceWeeks} week(s).`,
        weeksTriggered: evidenceWeeks,
        severity: calculateSeverity({ weeksTriggered: evidenceWeeks, magnitude }),
        areaLabel: 'governance',
      }),
    );
  }

  const overdueWeeks = countWeeks(
    series,
    (entry) => (entry.overdue_load_p0 ?? entry.overdue_load ?? 0) > 0,
  );
  if (overdueWeeks >= (thresholds.recurring_overdue_weeks ?? 2)) {
    const magnitude = Math.max(
      ...series.map((entry) => entry.overdue_load_p0 ?? entry.overdue_load ?? 0),
    );
    candidates.push(
      buildCandidate({
        slug: 'p0-sla-adherence',
        title: 'P0 SLA adherence enforcement',
        reason: `overdue_load_p0 > 0 in ${overdueWeeks} week(s).`,
        weeksTriggered: overdueWeeks,
        severity: calculateSeverity({ weeksTriggered: overdueWeeks, magnitude }),
        areaLabel: 'reliability',
      }),
    );
  }

  const riskIndexAvg = retrospective.metrics.averages?.risk_index ?? 0;
  const riskThreshold = thresholds.min_risk_index_avg ?? 30;
  if (riskIndexAvg >= riskThreshold) {
    candidates.push(
      buildCandidate({
        slug: 'systemic-risk-reduction',
        title: 'Systemic risk reduction program',
        reason: `risk_index_avg ${riskIndexAvg.toFixed(1)} >= ${riskThreshold}.`,
        weeksTriggered: series.length,
        severity: calculateSeverity({ weeksTriggered: series.length, magnitude: riskIndexAvg / 10 }),
        areaLabel: 'risk',
      }),
    );
  }

  return candidates.sort((a, b) => b.severity - a.severity || a.slug.localeCompare(b.slug));
}

export async function deriveStabilizationRoadmapCandidates({ retrospectivePath, policyPath, outPath }) {
  const retroRaw = await readFile(retrospectivePath, 'utf8');
  const retrospective = JSON.parse(retroRaw);
  const policyRaw = await readFile(policyPath, 'utf8');
  const policyDoc = yaml.load(policyRaw);
  const policy = policyDoc.stabilization_roadmap_handoff || {};

  const candidates = deriveCandidates({ retrospective, policy });
  const maxCandidates = policy.max_candidates ?? 5;

  const output = {
    generated_at:
      retrospective.generated_at || new Date().toISOString(),
    generated_from_sha: retrospective.generated_from_sha || null,
    window: retrospective.window,
    policy: {
      max_candidates: maxCandidates,
      thresholds: policy.thresholds || {},
    },
    candidates: candidates.slice(0, maxCandidates),
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(output, null, 2));

  return output;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const args = parseArgs(process.argv.slice(2));
  const retrospectivePath =
    args.retrospective || 'artifacts/stabilization/retrospective/retro_latest.json';
  const policyPath = args.policy || 'release-policy.yml';
  const outPath =
    args.out || 'artifacts/stabilization/roadmap-handoff/candidates.json';

  await deriveStabilizationRoadmapCandidates({
    retrospectivePath,
    policyPath,
    outPath,
  });
}
