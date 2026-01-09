import { mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  METRIC_FIELDS,
  METRIC_PREFER_HIGHER,
  average,
  extractMetrics,
  formatNumber,
  formatPercentage,
  normalizeWeekEnding,
  readJsonIfPresent,
  resolveArtifactPaths,
  summarizeOffenders,
} from './lib/stabilization-metrics.mjs';

const execFileAsync = promisify(execFile);

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

function sortWeekEntries(entries) {
  return entries.sort((a, b) => {
    if (a.week_ending === b.week_ending) {
      return 0;
    }
    if (a.week_ending === null) {
      return 1;
    }
    if (b.week_ending === null) {
      return -1;
    }
    return a.week_ending.localeCompare(b.week_ending);
  });
}

async function loadFromLocal({ artifactDir, weeks }) {
  const entries = await readdir(artifactDir, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .slice(0, weeks);

  const weekly = [];
  const missingArtifacts = [];

  for (const dirName of directories) {
    const baseDir = path.join(artifactDir, dirName);
    const paths = resolveArtifactPaths(baseDir);
    const scorecard = await readJsonIfPresent(paths.scorecard);
    const escalation = await readJsonIfPresent(paths.escalation);
    const diff = await readJsonIfPresent(paths.diff);
    if (!scorecard) {
      missingArtifacts.push(`${dirName}/scorecard.json`);
    }
    if (!escalation) {
      missingArtifacts.push(`${dirName}/escalation.json`);
    }
    if (!diff) {
      missingArtifacts.push(`${dirName}/diff.json`);
    }
    weekly.push({
      baseDir,
      dirName,
      scorecard,
      escalation,
      diff,
    });
  }

  return { weekly, missingArtifacts };
}

async function downloadArtifact({ url, token, destPath }) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to download artifact: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(destPath, Buffer.from(arrayBuffer));
}

async function unzipArtifact(zipPath, targetDir) {
  await mkdir(targetDir, { recursive: true });
  await execFileAsync('unzip', ['-q', '-o', zipPath, '-d', targetDir]);
}

async function loadFromCi({ weeks, repo, token, artifactPrefix }) {
  const apiUrl = `https://api.github.com/repos/${repo}/actions/artifacts?per_page=100`;
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to list artifacts: ${response.status}`);
  }
  const payload = await response.json();
  const artifacts = (payload.artifacts || [])
    .filter((artifact) => artifact.name.startsWith(artifactPrefix))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, weeks);

  const weekly = [];
  const missingArtifacts = [];
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'stabilization-closeout-'));

  for (const artifact of artifacts) {
    const safeName = artifact.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipPath = path.join(tmpRoot, `${safeName}.zip`);
    const extractDir = path.join(tmpRoot, safeName);
    await downloadArtifact({
      url: artifact.archive_download_url,
      token,
      destPath: zipPath,
    });
    await unzipArtifact(zipPath, extractDir);

    const paths = resolveArtifactPaths(extractDir);
    const scorecard = await readJsonIfPresent(paths.scorecard);
    const escalation = await readJsonIfPresent(paths.escalation);
    const diff = await readJsonIfPresent(paths.diff);
    if (!scorecard) {
      missingArtifacts.push(`${artifact.name}/scorecard.json`);
    }
    if (!escalation) {
      missingArtifacts.push(`${artifact.name}/escalation.json`);
    }
    if (!diff) {
      missingArtifacts.push(`${artifact.name}/diff.json`);
    }
    weekly.push({
      baseDir: extractDir,
      dirName: artifact.name,
      scorecard,
      escalation,
      diff,
    });
  }

  return { weekly, missingArtifacts };
}

export function buildRetrospective({ weeklySnapshots, missingArtifacts, weeksRequested }) {
  const weekly = weeklySnapshots
    .map((snapshot) => {
      const weekEnding = normalizeWeekEnding(snapshot.scorecard, snapshot.dirName);
      const metrics = extractMetrics({
        scorecard: snapshot.scorecard,
        escalation: snapshot.escalation,
      });
      const overdueItems = (snapshot.escalation?.overdue_items || []).map((item) => ({
        ...item,
        week_ending: weekEnding,
      }));
      return {
        week_ending: weekEnding,
        metrics,
        overdue_items: overdueItems,
        sources: {
          scorecard: path.join(snapshot.baseDir, 'scorecard.json'),
          escalation: path.join(snapshot.baseDir, 'escalation.json'),
          diff: path.join(snapshot.baseDir, 'diff.json'),
        },
      };
    })
    .filter((entry) => entry.week_ending)
    .sort((a, b) => a.week_ending.localeCompare(b.week_ending));

  const metricsSeries = weekly.map((entry) => ({
    week_ending: entry.week_ending,
    ...entry.metrics,
  }));

  const averages = {};
  METRIC_FIELDS.forEach((field) => {
    averages[field] = average(metricsSeries.map((entry) => entry[field]));
  });

  const overdueItems = weekly.flatMap((entry) => entry.overdue_items);
  const offenderSummary = summarizeOffenders(overdueItems);
  const recurringItems = offenderSummary.items.filter((item) => item.weeks >= 2);

  const improvements = [];
  const regressions = [];
  const first = metricsSeries[0] || {};
  const last = metricsSeries[metricsSeries.length - 1] || {};

  METRIC_FIELDS.forEach((field) => {
    if (first[field] === null || last[field] === null || first[field] === undefined || last[field] === undefined) {
      return;
    }
    const delta = last[field] - first[field];
    const prefersHigher = METRIC_PREFER_HIGHER.has(field);
    const improved = prefersHigher ? delta > 0 : delta < 0;
    const target = improved ? improvements : regressions;
    if (delta !== 0) {
      target.push({
        metric: field,
        delta,
        from: first[field],
        to: last[field],
      });
    }
  });

  const focusThemes = [];
  regressions.forEach((regression) => {
    focusThemes.push({
      theme: `Reverse ${regression.metric.replace(/_/g, ' ')}`,
      rationale: `Moved from ${formatNumber(regression.from)} to ${formatNumber(
        regression.to,
      )}.`,
    });
  });

  if (recurringItems.length) {
    focusThemes.push({
      theme: 'Resolve recurring overdue items',
      rationale: `${recurringItems.length} items breached in 2+ weeks; prioritize systemic unblockers.`,
    });
  }

  const dataQualityNotes = [];
  if (missingArtifacts.length) {
    dataQualityNotes.push(
      `Governed Exception: ${missingArtifacts.length} artifacts missing; deferred pending upload.`,
    );
  }
  if (weekly.length < weeksRequested) {
    dataQualityNotes.push(
      `Governed Exception: ${weeksRequested - weekly.length} weeks unavailable; deferred pending capture.`,
    );
  }

  const startWeek = weekly[0]?.week_ending ?? null;
  const endWeek = weekly[weekly.length - 1]?.week_ending ?? null;

  return {
    window: {
      weeks_requested: weeksRequested,
      weeks_included: weekly.length,
      start: startWeek,
      end: endWeek,
    },
    metrics: {
      series: metricsSeries,
      averages,
    },
    improvements,
    regressions,
    recurring_offenders: {
      items: recurringItems,
      areas: offenderSummary.areas,
      owners: offenderSummary.owners,
    },
    focus_themes: focusThemes.slice(0, 5),
    data_quality: {
      weeks_included: weekly.length,
      missing_artifacts: missingArtifacts,
      notes: dataQualityNotes,
    },
    sources: weekly.map((entry) => ({
      week_ending: entry.week_ending,
      ...entry.sources,
    })),
  };
}

function toTimestampLabel(dateString) {
  if (!dateString) {
    const fallback = new Date().toISOString().slice(0, 10);
    return fallback;
  }
  return dateString;
}

function renderMarkdown(retrospective) {
  const lines = [];
  lines.push(`# Stabilization Retrospective (${retrospective.window.start} → ${retrospective.window.end})`);
  lines.push('');
  lines.push(`Generated: ${retrospective.generated_at}`);
  lines.push(`Weeks included: ${retrospective.window.weeks_included}`);
  lines.push('');
  lines.push('## Window summary');
  lines.push(
    [
      '| Week ending | risk_index | done_p0 | done_p1 | on_time_rate | overdue_load | evidence_compliance | issuance_completeness | blocked_unissued |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ].join('\n'),
  );
  retrospective.metrics.series.forEach((entry) => {
    lines.push(
      `| ${entry.week_ending} | ${formatNumber(entry.risk_index)} | ${formatNumber(
        entry.done_p0,
      )} | ${formatNumber(entry.done_p1)} | ${formatPercentage(
        entry.on_time_rate,
      )} | ${formatNumber(entry.overdue_load)} | ${formatPercentage(
        entry.evidence_compliance,
      )} | ${formatPercentage(entry.issuance_completeness)} | ${formatNumber(
        entry.blocked_unissued,
      )} |`,
    );
  });
  lines.push('');
  lines.push('## What improved');
  if (!retrospective.improvements.length) {
    lines.push('- Deferred pending improvement deltas.');
  } else {
    retrospective.improvements.forEach((improvement) => {
      lines.push(
        `- ${improvement.metric.replace(/_/g, ' ')}: ${formatNumber(
          improvement.from,
        )} → ${formatNumber(improvement.to)}.`,
      );
    });
  }
  lines.push('');
  lines.push('## What regressed');
  if (!retrospective.regressions.length) {
    lines.push('- Deferred pending regression deltas.');
  } else {
    retrospective.regressions.forEach((regression) => {
      lines.push(
        `- ${regression.metric.replace(/_/g, ' ')}: ${formatNumber(
          regression.from,
        )} → ${formatNumber(regression.to)}.`,
      );
    });
  }
  lines.push('');
  lines.push('## Recurring blockers');
  if (!retrospective.recurring_offenders.items.length) {
    lines.push('- Deferred pending recurring blockers.');
  } else {
    lines.push('| Item | Area | Owner | Weeks |');
    lines.push('| --- | --- | --- | --- |');
    retrospective.recurring_offenders.items.slice(0, 10).forEach((item) => {
      lines.push(`| ${item.id} | ${item.area} | ${item.owner} | ${item.weeks} |`);
    });
  }
  lines.push('');
  lines.push('## Focus next month');
  if (!retrospective.focus_themes.length) {
    lines.push('- Deferred pending focus themes.');
  } else {
    retrospective.focus_themes.forEach((theme, index) => {
      lines.push(`${index + 1}. ${theme.theme} — ${theme.rationale}`);
    });
  }
  lines.push('');
  lines.push('## Data quality');
  lines.push(`- Weeks included: ${retrospective.window.weeks_included}`);
  if (retrospective.data_quality.missing_artifacts.length) {
    lines.push(
      `- Missing artifacts: ${retrospective.data_quality.missing_artifacts.join(', ')}`,
    );
  }
  retrospective.data_quality.notes.forEach((note) => {
    lines.push(`- ${note}`);
  });
  lines.push('');
  lines.push('Generated by: generate_stabilization_retrospective.mjs');

  return lines.join('\n');
}

export async function generateStabilizationRetrospective(options) {
  const {
    weeks,
    outDir,
    source,
    artifactDir,
    repo,
    token,
    artifactPrefix,
  } = options;

  let weeklySnapshots = [];
  let missingArtifacts = [];

  if (source === 'ci') {
    ({ weekly: weeklySnapshots, missingArtifacts } = await loadFromCi({
      weeks,
      repo,
      token,
      artifactPrefix,
    }));
  } else if (source === 'local') {
    ({ weekly: weeklySnapshots, missingArtifacts } = await loadFromLocal({
      artifactDir,
      weeks,
    }));
  } else {
    try {
      ({ weekly: weeklySnapshots, missingArtifacts } = await loadFromCi({
        weeks,
        repo,
        token,
        artifactPrefix,
      }));
    } catch {
      ({ weekly: weeklySnapshots, missingArtifacts } = await loadFromLocal({
        artifactDir,
        weeks,
      }));
    }
  }

  const retrospective = buildRetrospective({
    weeklySnapshots,
    missingArtifacts,
    weeksRequested: weeks,
  });
  const deterministicTimestamp =
    process.env.STABILIZATION_RETRO_TIMESTAMP ||
    (retrospective.window.end
      ? `${retrospective.window.end}T00:00:00Z`
      : new Date().toISOString());
  retrospective.generated_at = deterministicTimestamp;
  retrospective.generated_from_sha =
    process.env.GITHUB_SHA || process.env.SOURCE_VERSION || null;

  const timestamp = toTimestampLabel(retrospective.window.end);
  await mkdir(outDir, { recursive: true });

  const mdPath = path.join(outDir, `RETRO_${timestamp}.md`);
  const jsonPath = path.join(outDir, `retro_${timestamp}.json`);

  await writeFile(mdPath, renderMarkdown(retrospective));
  await writeFile(jsonPath, JSON.stringify(retrospective, null, 2));

  return { mdPath, jsonPath, retrospective };
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const args = parseArgs(process.argv.slice(2));
  const weeks = Number(args.weeks || 4);
  const outDir = args['out-dir'] || 'artifacts/stabilization/retrospective';
  const source = args.source || 'auto';
  const artifactDir = args['artifact-dir'] || 'artifacts/stabilization/weekly';
  const repo = args.repo || process.env.GITHUB_REPOSITORY;
  const token =
    args.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const artifactPrefix =
    args['artifact-prefix'] || 'stabilization-closeout-weekly';

  if (source === 'ci' && (!repo || !token)) {
    throw new Error('CI source requires GITHUB_REPOSITORY and GITHUB_TOKEN.');
  }

  await generateStabilizationRetrospective({
    weeks,
    outDir,
    source,
    artifactDir,
    repo,
    token,
    artifactPrefix,
  });
}
