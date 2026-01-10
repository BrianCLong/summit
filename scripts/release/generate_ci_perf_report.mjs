#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import {
  buildUnitId,
  ensureDirectory,
  formatIso,
  loadBudgetConfig,
  loadOverrides,
} from './lib/ci-perf.mjs';

const program = new Command();

program
  .option('--summary <path>', 'CI durations summary', 'dist/ci-perf/ci-durations-summary.json')
  .option('--budget-file <path>', 'Budget file path', 'release/CI_PERF_BUDGET.yml')
  .option('--overrides-file <path>', 'Overrides file path', '.github/ci-budget-overrides.yml')
  .option('--out-dir <path>', 'Output directory', 'dist/ci-perf')
  .parse(process.argv);

const options = program.opts();

function safeReadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findWindow(summary, windowKey) {
  return summary.windows?.[windowKey] ?? null;
}

function percentChange(currentValue, baselineValue) {
  if (baselineValue === null || baselineValue === 0 || baselineValue === undefined) {
    return null;
  }
  return ((currentValue - baselineValue) / baselineValue) * 100;
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return value.toFixed(1);
}

function buildSvgChart(items) {
  const width = 600;
  const height = 200;
  const barWidth = 80;
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const barGap = 20;
  const startX = 40;
  const baseY = 160;

  const bars = items
    .map((item, index) => {
      const barHeight = Math.round((item.value / maxValue) * 100);
      const x = startX + index * (barWidth + barGap);
      const y = baseY - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#0969da" />
        <text x="${x + barWidth / 2}" y="${baseY + 16}" font-size="10" text-anchor="middle">${item.label}</text>
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" text-anchor="middle">${formatNumber(item.value)}%</text>
      `;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${width / 2}" y="24" font-size="14" text-anchor="middle" fill="#24292f">Top CI Runtime Regressions (7d vs 30d)</text>
  <line x1="30" y1="${baseY}" x2="${width - 30}" y2="${baseY}" stroke="#d0d7de" />
  ${bars}
</svg>`;
}

function buildHtmlFragment(report, chartFile) {
  const regressions = report.regressions.slice(0, 5);
  const improvements = report.improvements.slice(0, 5);
  const nearLimits = report.near_hard_limits.slice(0, 5);

  const listItems = (items) =>
    items
      .map(
        (item) =>
          `<li><strong>${item.unit_id}</strong> — ${formatNumber(item.delta_percent)}%</li>`,
      )
      .join('');

  const nearList = (items) =>
    items
      .map(
        (item) =>
          `<li><strong>${item.unit_id}</strong> — ${item.p95_seconds}s (limit ${item.hard_limit_seconds}s)</li>`,
      )
      .join('');

  const overrideList = (items) =>
    items
      .map(
        (item) =>
          `<li><strong>${item.id}</strong> — expires ${item.expires}</li>`,
      )
      .join('');

  return `
<section>
  <h2>CI Performance Trend (Weekly)</h2>
  <p>Generated: ${report.generated_at}</p>
  <h3>Top Regressions</h3>
  <ul>${listItems(regressions) || '<li>None</li>'}</ul>
  <h3>Top Improvements</h3>
  <ul>${listItems(improvements) || '<li>None</li>'}</ul>
  <h3>Jobs Near Hard Limits</h3>
  <ul>${nearList(nearLimits) || '<li>None</li>'}</ul>
  <h3>Governed Exceptions</h3>
  <ul>${overrideList(report.overrides.expiring_soon) || '<li>None</li>'}</ul>
  <p><img src="${chartFile}" alt="CI performance regressions chart" style="max-width:100%;" /></p>
</section>
`;
}

function main() {
  const summary = safeReadJson(options.summary);
  const budgets = loadBudgetConfig(options.budgetFile);
  const overrides = loadOverrides(options.overridesFile);

  const summaryMap = new Map();
  for (const unit of summary.units ?? []) {
    summaryMap.set(unit.unit_id, unit);
  }

  const regressions = [];
  const improvements = [];
  const nearHardLimits = [];

  for (const budget of budgets.budgets ?? []) {
    const unitId = buildUnitId(budget);
    const unit = summaryMap.get(unitId);
    if (!unit) {
      continue;
    }
    const window7 = findWindow(unit, '7d');
    const window30 = findWindow(unit, '30d');
    const delta = percentChange(window7?.p95_seconds ?? null, window30?.p95_seconds ?? null);
    if (delta !== null) {
      const payload = {
        unit_id: unitId,
        delta_percent: delta,
        p95_7d: window7?.p95_seconds ?? null,
        p95_30d: window30?.p95_seconds ?? null,
      };
      if (delta >= 0) {
        regressions.push(payload);
      } else {
        improvements.push(payload);
      }
    }

    if (window7?.p95_seconds !== null && window7?.p95_seconds !== undefined) {
      if (window7.p95_seconds >= budget.hard_limit_seconds * 0.9) {
        nearHardLimits.push({
          unit_id: unitId,
          p95_seconds: window7.p95_seconds,
          hard_limit_seconds: budget.hard_limit_seconds,
        });
      }
    }
  }

  regressions.sort((a, b) => b.delta_percent - a.delta_percent);
  improvements.sort((a, b) => a.delta_percent - b.delta_percent);
  nearHardLimits.sort((a, b) => b.p95_seconds - a.p95_seconds);

  const nowIso = formatIso(new Date());
  const overrideExpiring = (overrides.overrides ?? []).filter((override) => {
    const expires = new Date(override.expires);
    const deltaDays = (expires - new Date()) / (24 * 60 * 60 * 1000);
    return deltaDays <= 7 && deltaDays >= 0;
  });

  const report = {
    generated_at: nowIso,
    regressions,
    improvements,
    near_hard_limits: nearHardLimits,
    overrides: {
      active: overrides.overrides ?? [],
      expiring_soon: overrideExpiring,
    },
  };

  ensureDirectory(options.outDir);
  const reportPath = path.join(options.outDir, 'ci_perf_report.json');
  const mdPath = path.join(options.outDir, 'ci_perf_report.md');
  const htmlPath = path.join(options.outDir, 'ci_perf_report.html');
  const chartPath = path.join(options.outDir, 'ci_perf_trend.svg');

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const mdLines = [];
  mdLines.push('# CI Performance Trend (Weekly)');
  mdLines.push('');
  mdLines.push(`Generated: ${report.generated_at}`);
  mdLines.push('');
  mdLines.push('## Top Regressions');
  if (regressions.length === 0) {
    mdLines.push('None');
  } else {
    mdLines.push('| Unit | Δ% (p95) | 7d p95 | 30d p95 |');
    mdLines.push('| --- | --- | --- | --- |');
    for (const item of regressions.slice(0, 10)) {
      mdLines.push(
        `| ${item.unit_id} | ${formatNumber(item.delta_percent)}% | ${
          item.p95_7d ?? '-'
        } | ${item.p95_30d ?? '-'} |`,
      );
    }
  }
  mdLines.push('');
  mdLines.push('## Top Improvements');
  if (improvements.length === 0) {
    mdLines.push('None');
  } else {
    mdLines.push('| Unit | Δ% (p95) | 7d p95 | 30d p95 |');
    mdLines.push('| --- | --- | --- | --- |');
    for (const item of improvements.slice(0, 10)) {
      mdLines.push(
        `| ${item.unit_id} | ${formatNumber(item.delta_percent)}% | ${
          item.p95_7d ?? '-'
        } | ${item.p95_30d ?? '-'} |`,
      );
    }
  }
  mdLines.push('');
  mdLines.push('## Jobs Near Hard Limits');
  if (nearHardLimits.length === 0) {
    mdLines.push('None');
  } else {
    mdLines.push('| Unit | 7d p95 | Hard Limit |');
    mdLines.push('| --- | --- | --- |');
    for (const item of nearHardLimits.slice(0, 10)) {
      mdLines.push(`| ${item.unit_id} | ${item.p95_seconds} | ${item.hard_limit_seconds} |`);
    }
  }
  mdLines.push('');
  mdLines.push('## Governed Exceptions');
  if (!overrideExpiring.length) {
    mdLines.push('No expiring overrides in the next 7 days.');
  } else {
    mdLines.push('| Override | Owner | Expires |');
    mdLines.push('| --- | --- | --- |');
    for (const override of overrideExpiring) {
      mdLines.push(`| ${override.id} | ${override.owner} | ${override.expires} |`);
    }
  }

  fs.writeFileSync(mdPath, `${mdLines.join('\n')}\n`);

  const chartData = regressions.slice(0, 5).map((item) => ({
    label: item.unit_id.split('::')[1] ?? item.unit_id,
    value: Math.max(item.delta_percent, 0),
  }));
  const svg = buildSvgChart(chartData.length ? chartData : [{ label: 'None', value: 0 }]);
  fs.writeFileSync(chartPath, svg);

  const htmlFragment = buildHtmlFragment(report, path.basename(chartPath));
  fs.writeFileSync(htmlPath, htmlFragment);

  console.log(`Wrote CI performance report to ${options.outDir}`);
}

main();
