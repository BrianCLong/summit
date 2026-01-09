import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  enforceDenylist,
  groupBy,
  median,
  quantile,
  summarizeDurations,
  writeJsonFile,
} from './lib/release-metrics.mjs';

const parseArgs = (argv) => {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args.set(key, true);
    } else {
      args.set(key, value);
      i += 1;
    }
  }
  return args;
};

const loadJsonl = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) {
    return [];
  }
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

const parseDate = (value) => new Date(value);

const toDateKey = (value) => value.toISOString().slice(0, 10);

const buildLineChart = ({ title, data, height = 200, width = 640 }) => {
  if (data.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }

  const padding = 40;
  const values = data.map((point) => point.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const xStep = (width - padding * 2) / Math.max(data.length - 1, 1);

  const points = data.map((point, index) => {
    const x = padding + index * xStep;
    const normalized = (point.value - minValue) / (maxValue - minValue || 1);
    const y = height - padding - normalized * (height - padding * 2);
    return `${x},${y}`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white" />
  <text x="${padding}" y="${padding - 10}" font-size="12" font-family="sans-serif">${title}</text>
  <polyline fill="none" stroke="#1f77b4" stroke-width="2" points="${points.join(' ')}" />
</svg>`;
};

const buildReport = (entries, sloConfig, now, days) => {
  const nowDate = parseDate(now);
  const since = new Date(nowDate.getTime() - days * 24 * 60 * 60 * 1000);
  const previousSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

  const filtered = entries.filter((entry) => {
    const capturedAt = parseDate(entry.captured_at);
    return capturedAt >= since && capturedAt <= nowDate;
  });
  const previous = entries.filter((entry) => {
    const capturedAt = parseDate(entry.captured_at);
    return capturedAt >= previousSince && capturedAt < since;
  });

  const mainEntries = filtered.filter((entry) => entry.candidate.type === 'main');
  const previousMainEntries = previous.filter((entry) => entry.candidate.type === 'main');

  const dateGroups = groupBy(mainEntries, (entry) =>
    toDateKey(parseDate(entry.captured_at)),
  );

  const availabilityDays = Array.from(dateGroups.entries()).map(([date, items]) => {
    const timeToGreen = items
      .map((entry) => entry.time_to_green_minutes)
      .filter((value) => typeof value === 'number');
    const gates = items.flatMap((entry) => entry.gates || []);
    const flakeCount = gates.filter((gate) => gate.rerun_count > 0).length;
    const flakeRate = gates.length > 0 ? flakeCount / gates.length : 0;
    return {
      date,
      releasable: items.some((entry) => entry.releasable),
      time_to_green_p50: median(timeToGreen),
      flake_rate: flakeRate,
    };
  });

  const releasableDays = availabilityDays.filter((day) => day.releasable).length;
  const totalDays = availabilityDays.length || 1;
  const availabilityRatio = releasableDays / totalDays;

  const timeToGreen = mainEntries
    .map((entry) => entry.time_to_green_minutes)
    .filter((value) => typeof value === 'number');

  const timeToGreenStats = {
    p50: median(timeToGreen),
    p95: quantile(timeToGreen, 0.95),
  };

  const gateGroups = groupBy(
    mainEntries.flatMap((entry) => entry.gates || []),
    (gate) => gate.name,
  );

  const gateStats = Array.from(gateGroups.entries()).map(([name, gates]) => {
    const durations = gates
      .map((gate) => gate.duration_minutes)
      .filter((value) => typeof value === 'number');
    const flakeCount = gates.filter((gate) => gate.rerun_count > 0).length;
    return {
      name,
      total_runs: gates.length,
      flake_rate: gates.length > 0 ? flakeCount / gates.length : 0,
      durations: summarizeDurations(durations),
    };
  });

  const previousGateGroups = groupBy(
    previousMainEntries.flatMap((entry) => entry.gates || []),
    (gate) => gate.name,
  );
  const regressions = gateStats
    .map((gate) => {
      const prevGates = previousGateGroups.get(gate.name) || [];
      const prevDurations = prevGates
        .map((item) => item.duration_minutes)
        .filter((value) => typeof value === 'number');
      const prevP95 = quantile(prevDurations, 0.95);
      const prevFlake = prevGates.length
        ? prevGates.filter((item) => item.rerun_count > 0).length / prevGates.length
        : null;
      return {
        name: gate.name,
        p95_delta:
          prevP95 !== null && gate.durations.p95 !== null
            ? gate.durations.p95 - prevP95
            : null,
        flake_delta:
          prevFlake !== null ? gate.flake_rate - prevFlake : null,
      };
    })
    .sort((a, b) => (b.p95_delta || 0) - (a.p95_delta || 0))
    .slice(0, 5);

  const flakeRateOverall = gateStats.reduce(
    (acc, gate) => acc + gate.flake_rate,
    0,
  );
  const flakeRateAverage = gateStats.length > 0 ? flakeRateOverall / gateStats.length : 0;

  return {
    generated_at: now,
    window: {
      days,
      since: since.toISOString(),
      until: nowDate.toISOString(),
    },
    slo_targets: sloConfig.slos,
    summary: {
      entries: filtered.length,
      availability_ratio: availabilityRatio,
      time_to_green: timeToGreenStats,
      flake_rate_average: flakeRateAverage,
      gates: gateStats,
      regressions,
    },
    availability_days: availabilityDays,
  };
};

const buildMarkdownReport = (report) => {
  const lines = [
    '# Release SLO Weekly Report',
    '',
    `Generated: ${report.generated_at}`,
    `Window: ${report.window.since} → ${report.window.until} (${report.window.days} days)`,
    '',
    '## Summary',
    '',
    `- Availability: ${(report.summary.availability_ratio * 100).toFixed(2)}%`,
    `- Time-to-green p50: ${report.summary.time_to_green.p50 ?? 'n/a'} minutes`,
    `- Time-to-green p95: ${report.summary.time_to_green.p95 ?? 'n/a'} minutes`,
    `- Average flake rate: ${(report.summary.flake_rate_average * 100).toFixed(2)}%`,
    '',
    '## Gate Durations & Flake Rates',
    '',
    '| Gate | Runs | Flake Rate | p50 (min) | p95 (min) |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const gate of report.summary.gates) {
    lines.push(
      `| ${gate.name} | ${gate.total_runs} | ${(gate.flake_rate * 100).toFixed(2)}% | ${
        gate.durations.p50 ?? 'n/a'
      } | ${gate.durations.p95 ?? 'n/a'} |`,
    );
  }

  lines.push('', '## Availability by Day', '');
  lines.push('| Day | Releasable |', '| --- | --- |');
  for (const day of report.availability_days) {
    lines.push(`| ${day.date} | ${day.releasable ? 'yes' : 'no'} |`);
  }

  lines.push('', '## Top Regressions', '');
  lines.push('| Gate | p95 Delta (min) | Flake Delta |', '| --- | --- | --- |');
  for (const regression of report.summary.regressions || []) {
    lines.push(
      `| ${regression.name} | ${regression.p95_delta ?? 'n/a'} | ${
        regression.flake_delta ?? 'n/a'
      } |`,
    );
  }

  lines.push('', '## Charts', '');
  lines.push('- Availability chart: `charts/availability.svg`');
  lines.push('- Time-to-green chart: `charts/time-to-green.svg`');
  lines.push('- Flake rate chart: `charts/flake-rate.svg`');

  return `${lines.join('\n')}\n`;
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const metricsPath = args.get('--metrics-path') || 'dist/release-metrics/release-metrics.jsonl';
  const outputDir = args.get('--output-dir') || 'dist/release-slo';
  const sloConfigPath = args.get('--slo-config') || 'release/RELEASE_SLO.yml';
  const days = Number(args.get('--days') || 7);
  const now = args.get('--now') || new Date().toISOString();

  const entries = loadJsonl(metricsPath);
  const sloConfig = yaml.load(fs.readFileSync(sloConfigPath, 'utf-8'));

  const report = buildReport(entries, sloConfig, now, days);
  enforceDenylist(report);

  fs.mkdirSync(outputDir, { recursive: true });
  writeJsonFile(path.join(outputDir, 'weekly-report.json'), report);

  const markdown = buildMarkdownReport(report);
  fs.writeFileSync(path.join(outputDir, 'weekly-report.md'), markdown);

  const chartsDir = path.join(outputDir, 'charts');
  fs.mkdirSync(chartsDir, { recursive: true });

  const availabilityChart = buildLineChart({
    title: 'Releasable main availability',
    data: report.availability_days.map((day) => ({
      label: day.date,
      value: day.releasable ? 1 : 0,
    })),
  });
  fs.writeFileSync(path.join(chartsDir, 'availability.svg'), availabilityChart);

  const timeToGreenChart = buildLineChart({
    title: 'Time-to-green (minutes)',
    data: report.availability_days.map((day) => ({
      label: day.date,
      value: day.time_to_green_p50 || 0,
    })),
  });
  fs.writeFileSync(path.join(chartsDir, 'time-to-green.svg'), timeToGreenChart);

  const flakeChart = buildLineChart({
    title: 'Flake rate average',
    data: report.availability_days.map((day) => ({
      label: day.date,
      value: day.flake_rate || 0,
    })),
  });
  fs.writeFileSync(path.join(chartsDir, 'flake-rate.svg'), flakeChart);

  console.log(`Weekly report written to ${outputDir}`);
};

main();
