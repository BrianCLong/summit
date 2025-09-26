#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

function loadAll(pattern) {
  return fg.sync([pattern]).flatMap(f => {
    try {
      return [JSON.parse(fs.readFileSync(f,'utf8'))];
    } catch {
      return [];
    }
  });
}

const args = process.argv.slice(2);
const get = (flag, def) => {
  const i=args.indexOf(flag);
  return i>=0 ? args[i+1] : def;
};
const sloReports = loadAll(get('--slo-reports','evidence/slo/*.json'));
const costReports = loadAll(get('--cost-reports','evidence/cost/*.json'));
const errBudgetThresh = parseFloat(get('--error-budget-threshold','0.4')); // burn must be <= 0.6 consumed
const replLagThresh = parseFloat(get('--replication-lag-threshold','60'));

let violations = [];
for (const r of sloReports) {
  if ((r.errorBudgetRemaining ?? 1) < 0.6) violations.push(`error budget low: ${r.errorBudgetRemaining}`);
  if ((r.replicationLagSec ?? 0) > replLagThresh) violations.push(`replication lag high: ${r.replicationLagSec}`);
}
for (const c of costReports) {
  if ((c.monthlySpendPct ?? 0) > 0.8) violations.push(`cost at ${Math.round((c.monthlySpendPct)*100)}%`);
}
if (violations.length) {
  console.error('Canary gate violations:
 - ' + violations.join('
 - '));
  process.exit(1);
}
console.log('Canary gate: OK');
