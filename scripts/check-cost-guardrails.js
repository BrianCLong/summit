#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

const budgetsPath = process.argv[2] || 'observability/cost/budgets.json';
const usagePath = process.argv[3] || 'observability/cost/current-usage.json';
const reportPath = process.argv[4] || 'cost-guardrails-report.json';

const budgets = readJson(budgetsPath);
const usage = readJson(usagePath);

const usageByKey = new Map();
usage.forEach((entry) => {
  usageByKey.set(entry.key, entry);
});

const alerts = [];
const rows = budgets.map((budget) => {
  const latest = usageByKey.get(budget.key) || { spend: 0, forecast: 0 };
  const ratio = budget.limit === 0 ? 0 : latest.spend / budget.limit;
  const forecastRatio = budget.limit === 0 ? 0 : latest.forecast / budget.limit;
  const status = ratio >= 1
    ? 'breached'
    : ratio >= 0.9 || forecastRatio >= 0.9
      ? 'burning-hot'
      : ratio >= 0.8 || forecastRatio >= 0.8
        ? 'at-risk'
        : 'healthy';

  if (status !== 'healthy') {
    alerts.push({
      key: budget.key,
      owner: budget.owner,
      limit: budget.limit,
      spend: latest.spend,
      forecast: latest.forecast,
      status,
      ratio: Number(ratio.toFixed(4)),
      forecastRatio: Number(forecastRatio.toFixed(4)),
      window: budget.window,
    });
  }

  return {
    key: budget.key,
    owner: budget.owner,
    limit: budget.limit,
    spend: latest.spend,
    forecast: latest.forecast,
    ratio: Number(ratio.toFixed(4)),
    forecastRatio: Number(forecastRatio.toFixed(4)),
    status,
    window: budget.window,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    limit: rows.reduce((acc, row) => acc + row.limit, 0),
    spend: rows.reduce((acc, row) => acc + row.spend, 0),
    forecast: rows.reduce((acc, row) => acc + row.forecast, 0),
  },
  budgets: rows,
  alerts,
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`Wrote cost guardrail report to ${reportPath}`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `report=${reportPath}\nalerts=${JSON.stringify(alerts)}\n`
  );
}

if (alerts.length) {
  console.log('Alerts detected:');
  alerts.forEach((alert) => {
    console.log(
      ` - ${alert.key} (${alert.owner}) at ${formatCurrency(alert.spend)} / ${formatCurrency(alert.limit)} [${alert.status}]`
    );
  });
} else {
  console.log('All budgets within guardrails.');
}
