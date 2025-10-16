import fs from 'fs';
const cfg = JSON.parse(fs.readFileSync('.maestro/ci_budget.json', 'utf8'));
const monthSpend = Number(process.env.COST_MONTH_USD || '0'); // from exporter
const phase = process.env.PHASE || 'pull_request';
const headroom = cfg.monthlyUsd * cfg.hardPct - monthSpend;
let concurrency = phase === 'main' ? 8 : 4;
if (monthSpend > cfg.monthlyUsd * cfg.softPct)
  concurrency = Math.max(2, Math.round(concurrency * 0.5));
if (headroom < 100) concurrency = 1;
console.log(JSON.stringify({ concurrency }));
