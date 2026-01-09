#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  commandExists,
  ensureDir,
  extractMetricBlock,
  extractOverdueItems,
  formatNumber,
  formatPercent,
  getValueByPath,
  listLocalCloseoutArtifacts,
  loadPolicy,
  normalizeWeekEnding,
  parseArgs,
  resolveRepo,
  resolveTimestamp,
  runCommand,
  selectTop,
  uniqueBy,
  writeJson,
} from './stabilization-utils.mjs';

const METRIC_PATHS = {
  risk_index: ['risk_index', 'metrics.risk_index', 'summary.risk_index'],
  done_p0: ['done_p0', 'done.p0', 'metrics.done_p0', 'summary.done_p0'],
  done_p1: ['done_p1', 'done.p1', 'metrics.done_p1', 'summary.done_p1'],
  on_time_rate: ['on_time_rate', 'metrics.on_time_rate', 'summary.on_time_rate'],
  overdue_load: ['overdue_load', 'metrics.overdue_load', 'summary.overdue_load'],
  evidence_compliance: [
    'evidence_compliance',
    'metrics.evidence_compliance',
    'summary.evidence_compliance',
  ],
  issuance_completeness: [
    'issuance_completeness',
    'metrics.issuance_completeness',
    'summary.issuance_completeness',
  ],
  blocked_unissued: [
    'blocked_unissued',
    'metrics.blocked_unissued',
    'summary.blocked_unissued',
  ],
};

const METRIC_DIRECTIONS = {
  risk_index: 'down',
  done_p0: 'up',
  done_p1: 'up',
  on_time_rate: 'up',
  overdue_load: 'down',
  evidence_compliance: 'up',
  issuance_completeness: 'up',
  blocked_unissued: 'down',
};

const DEFAULT_OUT_DIR = 'artifacts/stabilization/retrospective';

async function fetchCloseoutFromGh({
  weeks,
  policy,
  repo,
  tempDir,
  dataQuality,
}) {
  const sources = policy.stabilization_retrospective.closeout_sources;
  const patterns = sources.artifact_name_patterns || {};
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!token) {
    dataQuality.missing_sources.push('github-token-missing');
    return new Map();
  }

  if (!commandExists('gh')) {
    dataQuality.missing_sources.push('github-cli-missing');
    return new Map();
  }

  const maxArtifacts = sources.max_artifacts || 80;
  const apiPath = `/repos/${repo.owner}/${repo.repo}/actions/artifacts?per_page=100`;
  const output = runCommand('gh', ['api', apiPath, '--paginate'], {
    env: { ...process.env, GITHUB_TOKEN: token },
  });
  const parsed = JSON.parse(output);
  const artifacts = Array.isArray(parsed.artifacts) ? parsed.artifacts : parsed;

  const byType = {
    scorecard: [],
    escalation: [],
    diff: [],
  };

  for (const artifact of artifacts) {
    const name = artifact.name || '';
    if (patterns.scorecard && name.includes(patterns.scorecard)) {
      byType.scorecard.push(artifact);
    }
    if (patterns.escalation && name.includes(patterns.escalation)) {
      byType.escalation.push(artifact);
    }
    if (patterns.diff && name.includes(patterns.diff)) {
      byType.diff.push(artifact);
    }
  }

  const weekEndingDay = policy.stabilization_retrospective.window.week_ending_day;
  const expectedFiles = sources.expected_files || {};

  const weekMap = new Map();

  for (const [type, items] of Object.entries(byType)) {
    const sorted = items
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, maxArtifacts);

    for (const artifact of sorted) {
      const dateMatch = (artifact.name || '').match(/\d{4}-\d{2}-\d{2}/);
      const weekKey =
        dateMatch?.[0] || normalizeWeekEnding(artifact.created_at, weekEndingDay);
      if (!weekKey) {
        continue;
      }
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {});
      }
      if (weekMap.get(weekKey)[type]) {
        continue;
      }
      const zipPath = path.join(tempDir, `${artifact.id}-${type}.zip`);
      const extractDir = path.join(tempDir, `${artifact.id}-${type}`);
      await ensureDir(extractDir);
      runCommand(
        'gh',
        [
          'api',
          `/repos/${repo.owner}/${repo.repo}/actions/artifacts/${artifact.id}/zip`,
          '--output',
          zipPath,
        ],
        { env: { ...process.env, GITHUB_TOKEN: token } },
      );
      if (!commandExists('unzip')) {
        dataQuality.missing_sources.push('unzip-missing');
        continue;
      }
      runCommand('unzip', ['-q', zipPath, '-d', extractDir]);
      const expectedFile = expectedFiles[type];
      if (!expectedFile) {
        continue;
      }
      const resolved = await findFileByName(extractDir, expectedFile);
      if (resolved) {
        weekMap.get(weekKey)[type] = resolved;
      }
      if (weekMap.size >= weeks) {
        break;
      }
    }
  }

  return weekMap;
}

async function findFileByName(dir, filename) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFileByName(fullPath, filename);
      if (found) {
        return found;
      }
    } else if (entry.isFile() && entry.name === filename) {
      return fullPath;
    }
  }
  return null;
}

function buildMetricSeries(weeks) {
  const series = {};
  for (const metric of Object.keys(METRIC_PATHS)) {
    series[metric] = weeks.map((week) => ({
      week_ending: week.week_ending,
      value: week.metrics[metric],
    }));
  }
  return series;
}

function computeDeltaSummary(weeks) {
  if (weeks.length < 2) {
    return { improvements: [], regressions: [] };
  }
  const first = weeks[0].metrics;
  const last = weeks[weeks.length - 1].metrics;
  const improvements = [];
  const regressions = [];

  for (const [metric, direction] of Object.entries(METRIC_DIRECTIONS)) {
    const start = first[metric];
    const end = last[metric];
    if (start === null || end === null) {
      continue;
    }
    const delta = end - start;
    const improved = direction === 'up' ? delta > 0 : delta < 0;
    const regressed = direction === 'up' ? delta < 0 : delta > 0;
    if (improved) {
      improvements.push({ metric, delta });
    }
    if (regressed) {
      regressions.push({ metric, delta });
    }
  }
  return { improvements, regressions };
}

function summarizeRecurringBlockers(weeks, policy) {
  const offenders = new Map();
  const areaCounts = new Map();
  const ownerCounts = new Map();

  for (const week of weeks) {
    for (const item of week.overdue_items) {
      const key = item.id || `${item.area || 'unknown'}:${item.owner || 'unknown'}`;
      const existing = offenders.get(key) || {
        id: item.id || 'unknown',
        area: item.area || 'unknown',
        owner: item.owner || 'unknown',
        weeks: 0,
      };
      existing.weeks += 1;
      offenders.set(key, existing);
    }
    const byArea = week.overdue_by_area || {};
    for (const [area, count] of Object.entries(byArea)) {
      areaCounts.set(area, (areaCounts.get(area) || 0) + Number(count));
    }
    const byOwner = week.overdue_by_owner || {};
    for (const [owner, count] of Object.entries(byOwner)) {
      ownerCounts.set(owner, (ownerCounts.get(owner) || 0) + Number(count));
    }
  }

  const recurringThreshold =
    policy.stabilization_roadmap_handoff.thresholds.recurring_overdue_weeks || 2;

  const recurring = [...offenders.values()]
    .filter((item) => item.weeks >= recurringThreshold)
    .sort((a, b) => b.weeks - a.weeks)
    .slice(0, 10);

  const topAreas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([area, count]) => ({ area, count }));

  const topOwners = [...ownerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([owner, count]) => ({ owner, count }));

  return { recurring, topAreas, topOwners };
}

function deriveFocusThemes(weeks, policy) {
  const thresholds = policy.stabilization_retrospective.focus_themes.thresholds;
  const themes = [];

  const evidenceBreaches = weeks.filter(
    (week) =>
      week.metrics.evidence_compliance !== null &&
      week.metrics.evidence_compliance < thresholds.evidence_compliance_min,
  );
  if (evidenceBreaches.length >= 1) {
    themes.push({
      theme: 'Evidence compliance recovery',
      rationale: `${evidenceBreaches.length} week(s) below ${thresholds.evidence_compliance_min}`,
    });
  }

  const onTimeBreaches = weeks.filter(
    (week) =>
      week.metrics.on_time_rate !== null &&
      week.metrics.on_time_rate < thresholds.on_time_rate_min,
  );
  if (onTimeBreaches.length >= 1) {
    themes.push({
      theme: 'On-time delivery reinforcement',
      rationale: `${onTimeBreaches.length} week(s) below ${thresholds.on_time_rate_min}`,
    });
  }

  const overdueBreaches = weeks.filter(
    (week) =>
      week.metrics.overdue_load !== null &&
      week.metrics.overdue_load >= thresholds.overdue_load_min,
  );
  if (overdueBreaches.length >= 1) {
    themes.push({
      theme: 'Overdue load reduction',
      rationale: `${overdueBreaches.length} week(s) at or above ${thresholds.overdue_load_min}`,
    });
  }

  const blockedBreaches = weeks.filter((week) => {
    const value = week.metrics.blocked_unissued;
    if (value === null || value === undefined) {
      return false;
    }
    const numeric = typeof value === 'number' ? value : Number(value);
    return numeric >= thresholds.blocked_unissued_min;
  });
  if (blockedBreaches.length >= 1) {
    themes.push({
      theme: 'Issuance hygiene',
      rationale: `${blockedBreaches.length} week(s) with blocked-unissued items`,
    });
  }

  if (weeks.length >= 2) {
    const first = weeks[0].metrics.risk_index;
    const last = weeks[weeks.length - 1].metrics.risk_index;
    if (first !== null && last !== null && last - first >= thresholds.risk_index_increase) {
      themes.push({
        theme: 'Systemic risk reduction',
        rationale: `risk_index increased by ${last - first} points`,
      });
    }
  }

  return selectTop(themes, policy.stabilization_retrospective.focus_themes.max, (a, b) =>
    a.theme.localeCompare(b.theme),
  );
}

async function readCloseoutJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/releases/generate_stabilization_retrospective.mjs [options]

Options:
  --weeks <n>       Number of weeks to include (default: policy weeks_default)
  --out-dir <dir>   Output directory (default: ${DEFAULT_OUT_DIR})
  --policy <path>   Policy YAML path
  --timestamp <ts>  Override timestamp token
`);
    process.exit(0);
  }

  const policy = await loadPolicy(args.policy);
  const weeksRequested = Number(args.weeks || policy.stabilization_retrospective.weeks_default);
  const outDir = args['out-dir'] || DEFAULT_OUT_DIR;
  const timestamp = resolveTimestamp(args.timestamp);

  const dataQuality = {
    weeks_requested: weeksRequested,
    missing_sources: [],
    missing_artifacts: [],
    notes: [],
  };

  const repo = resolveRepo();
  const tempDir = path.join(outDir, '.tmp');
  await ensureDir(tempDir);

  let weekMap = new Map();
  const localDir = policy.stabilization_retrospective.closeout_sources.local_dir;
  try {
    const stats = await fs.stat(localDir);
    if (stats.isDirectory()) {
      weekMap = await listLocalCloseoutArtifacts(
        localDir,
        policy.stabilization_retrospective.closeout_sources.expected_files,
      );
    }
  } catch (error) {
    dataQuality.notes.push('Local closeout directory not found; deferred to CI fetch.');
  }

  if (weekMap.size === 0) {
    weekMap = await fetchCloseoutFromGh({
      weeks: weeksRequested,
      policy,
      repo,
      tempDir,
      dataQuality,
    });
  }

  const weekEntries = [...weekMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-weeksRequested);

  const weeks = [];
  for (const [weekKey, sources] of weekEntries) {
    const metrics = {};
    let overdueItems = [];
    let overdueByArea = {};
    let overdueByOwner = {};

    for (const [type, filePath] of Object.entries(sources)) {
      if (!filePath) {
        dataQuality.missing_artifacts.push({ week: weekKey, type });
        continue;
      }
      const data = await readCloseoutJson(filePath);
      if (type === 'scorecard') {
        for (const [metric, paths] of Object.entries(METRIC_PATHS)) {
          if (metric === 'blocked_unissued') {
            continue;
          }
          metrics[metric] = extractMetricBlock(data, paths);
        }
      }
      if (type === 'escalation' || type === 'diff') {
        overdueItems = overdueItems.concat(extractOverdueItems(data));
        overdueByArea =
          getValueByPath(data, ['overdue_by_area', 'metrics.overdue_by_area']) ||
          overdueByArea;
        overdueByOwner =
          getValueByPath(data, ['overdue_by_owner', 'metrics.overdue_by_owner']) ||
          overdueByOwner;
      }
      if (type === 'diff' || type === 'escalation') {
        if (metrics.blocked_unissued === undefined) {
          metrics.blocked_unissued = extractMetricBlock(data, METRIC_PATHS.blocked_unissued);
        }
      }
    }

    for (const metric of Object.keys(METRIC_PATHS)) {
      if (metrics[metric] === undefined) {
        metrics[metric] = null;
      }
    }

    weeks.push({
      week_ending: weekKey,
      metrics,
      overdue_items: uniqueBy(overdueItems, (item) => item.id || `${item.area}:${item.owner}`),
      overdue_by_area: overdueByArea || {},
      overdue_by_owner: overdueByOwner || {},
      sources,
    });
  }

  const series = buildMetricSeries(weeks);
  const { improvements, regressions } = computeDeltaSummary(weeks);
  const blockers = summarizeRecurringBlockers(weeks, policy);
  const focusThemes = deriveFocusThemes(weeks, policy);

  dataQuality.weeks_included = weeks.length;
  if (weeks.length < weeksRequested) {
    dataQuality.notes.push(
      `Intentionally constrained: only ${weeks.length} week(s) resolved from sources.`,
    );
  }

  const retroJson = {
    generated_at: new Date().toISOString(),
    window_weeks: weeksRequested,
    weeks,
    metrics_series: series,
    improvements,
    regressions,
    recurring_blockers: blockers,
    focus_themes: focusThemes,
    data_quality: dataQuality,
    sources: {
      repo,
      local_dir: localDir,
    },
  };

  await ensureDir(outDir);
  const retroJsonPath = path.join(outDir, `retro_${timestamp}.json`);
  await writeJson(retroJsonPath, retroJson);

  const latestJsonPath = path.join(outDir, 'retro_latest.json');
  await writeJson(latestJsonPath, retroJson);

  const retroMdPath = path.join(outDir, `RETRO_${timestamp}.md`);
  const md = renderMarkdown(retroJson, retroJsonPath);
  await fs.writeFile(retroMdPath, md, 'utf8');

  console.log(`Retrospective written to ${retroMdPath}`);
  console.log(`Retrospective JSON written to ${retroJsonPath}`);
}

function renderMarkdown(retro, retroJsonPath) {
  const header = `# Stabilization Retrospective\n\n`;
  const windowSummary = renderWindowTable(retro);
  const improvements = renderDeltaSection('What improved', retro.improvements, true);
  const regressions = renderDeltaSection('What regressed', retro.regressions, false);
  const blockers = renderBlockers(retro.recurring_blockers);
  const focus = renderFocusThemes(retro.focus_themes);
  const dataQuality = renderDataQuality(retro.data_quality, retroJsonPath);

  return [
    header,
    `**Window:** ${retro.window_weeks} week(s) ending ${
      retro.weeks[retro.weeks.length - 1]?.week_ending || 'n/a'
    }\n\n`,
    windowSummary,
    improvements,
    regressions,
    blockers,
    focus,
    dataQuality,
  ].join('\n');
}

function renderWindowTable(retro) {
  const rows = retro.weeks.map((week) => {
    return [
      week.week_ending,
      formatNumber(week.metrics.risk_index),
      formatNumber(week.metrics.done_p0),
      formatNumber(week.metrics.done_p1),
      formatPercent(week.metrics.on_time_rate),
      formatNumber(week.metrics.overdue_load),
      formatPercent(week.metrics.evidence_compliance),
      formatPercent(week.metrics.issuance_completeness),
      formatNumber(week.metrics.blocked_unissued),
    ].join(' | ');
  });

  return [
    '## Window Summary',
    '',
    'Week Ending | risk_index | done_p0 | done_p1 | on_time_rate | overdue_load | evidence_compliance | issuance_completeness | blocked_unissued',
    '--- | --- | --- | --- | --- | --- | --- | --- | ---',
    ...rows,
    '',
  ].join('\n');
}

function renderDeltaSection(title, entries, isImprovement) {
  if (!entries.length) {
    return `## ${title}\n\nNo material ${isImprovement ? 'improvements' : 'regressions'} detected.\n\n`;
  }
  const lines = entries.map(
    (entry) => `- ${entry.metric}: ${entry.delta > 0 ? '+' : ''}${entry.delta}`,
  );
  return `## ${title}\n\n${lines.join('\n')}\n\n`;
}

function renderBlockers(blockers) {
  const lines = blockers.recurring.map(
    (item) =>
      `- ${item.id} (area: ${item.area}, owner: ${item.owner}) — ${item.weeks} week(s)`,
  );
  const areaLines = blockers.topAreas.map(
    (item) => `- ${item.area}: ${item.count} overdue`,
  );
  const ownerLines = blockers.topOwners.map(
    (item) => `- ${item.owner}: ${item.count} overdue`,
  );
  return [
    '## Recurring Blockers',
    '',
    lines.length ? lines.join('\n') : '- No recurring blockers met threshold.',
    '',
    '### Repeated Overdue Load by Area',
    '',
    areaLines.length ? areaLines.join('\n') : '- None reported.',
    '',
    '### Repeated Overdue Load by Owner',
    '',
    ownerLines.length ? ownerLines.join('\n') : '- None reported.',
    '',
  ].join('\n');
}

function renderFocusThemes(themes) {
  const lines = themes.length
    ? themes.map((theme) => `- ${theme.theme}: ${theme.rationale}`)
    : ['- No focus themes triggered by rule thresholds.'];
  return ['## Focus Next Month', '', ...lines, '',].join('\n');
}

function renderDataQuality(dataQuality, retroJsonPath) {
  const missingSources = dataQuality.missing_sources.length
    ? dataQuality.missing_sources.map((entry) => `- ${entry}`).join('\n')
    : '- None.';
  const missingArtifacts = dataQuality.missing_artifacts.length
    ? dataQuality.missing_artifacts
        .map((entry) => `- ${entry.week}: ${entry.type}`)
        .join('\n')
    : '- None.';
  const notes = dataQuality.notes.length
    ? dataQuality.notes.map((entry) => `- ${entry}`).join('\n')
    : '- None.';

  return [
    '## Data Quality',
    '',
    `Weeks requested: ${dataQuality.weeks_requested}`,
    `Weeks included: ${dataQuality.weeks_included || 0}`,
    '',
    '### Missing Sources (Governed Exceptions)',
    missingSources,
    '',
    '### Missing Artifacts (Governed Exceptions)',
    missingArtifacts,
    '',
    '### Notes',
    notes,
    '',
    `Retrospective JSON: ${retroJsonPath}`,
    '',
  ].join('\n');
}

await main();
