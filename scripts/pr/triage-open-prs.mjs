#!/usr/bin/env node
import fs from 'node:fs';

function parseArgs(argv) {
  const args = {
    input: '',
    output: 'artifacts/pr-triage-plan.json',
    staleDays: 180,
    warnDays: 90,
    batchSize: 50,
    keepaliveLabels: ['keepalive', 'security', 'release'],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[++i];
    else if (arg === '--output') args.output = argv[++i];
    else if (arg === '--stale-days') args.staleDays = Number(argv[++i]);
    else if (arg === '--warn-days') args.warnDays = Number(argv[++i]);
    else if (arg === '--batch-size') args.batchSize = Number(argv[++i]);
    else if (arg === '--keepalive-labels') args.keepaliveLabels = argv[++i].split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    else if (arg === '--help') {
      console.log(`Usage: node scripts/pr/triage-open-prs.mjs --input prs.json [options]\n\nOptions:\n  --output <path>            Output plan path (default: artifacts/pr-triage-plan.json)\n  --stale-days <n>           Close threshold in days (default: 180)\n  --warn-days <n>            Warn threshold in days (default: 90)\n  --batch-size <n>           Max PR actions per run (default: 50)\n  --keepalive-labels <csv>   Labels exempt from stale closure\n`);
      process.exit(0);
    }
  }

  if (!args.input) {
    throw new Error('Missing required --input path.');
  }
  if (Number.isNaN(args.staleDays) || Number.isNaN(args.warnDays) || Number.isNaN(args.batchSize)) {
    throw new Error('Numeric options must be valid numbers.');
  }
  return args;
}

function daysSince(isoDate) {
  const now = Date.now();
  const then = Date.parse(isoDate);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  const diffMs = now - then;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function toLabelSet(pr) {
  const labels = pr.labels ?? [];
  return new Set(labels.map((item) => {
    if (typeof item === 'string') return item.toLowerCase();
    if (item && typeof item.name === 'string') return item.name.toLowerCase();
    return '';
  }).filter(Boolean));
}

function classify(pr, cfg) {
  const labels = toLabelSet(pr);
  const age = daysSince(pr.updatedAt);
  const exempt = cfg.keepaliveLabels.some((label) => labels.has(label));

  if (!Number.isFinite(age)) {
    return { action: 'needs_manual_review', reason: 'invalid updatedAt timestamp', ageDays: age };
  }

  if (!exempt && age > cfg.staleDays) {
    return {
      action: 'close',
      reason: `stale > ${cfg.staleDays}d with no exempt labels`,
      ageDays: age,
      commentKey: 'close_stale_180',
    };
  }

  if (!exempt && age > cfg.warnDays) {
    return {
      action: 'warn',
      reason: `inactive ${cfg.warnDays}-${cfg.staleDays}d; request rebase within 14d`,
      ageDays: age,
      commentKey: 'warn_rebase_14d',
    };
  }

  return {
    action: 'keep',
    reason: 'active or exempt',
    ageDays: age,
  };
}

function chunk(items, chunkSize) {
  const out = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(items.slice(i, i + chunkSize));
  }
  return out;
}

function ensureDir(path) {
  const idx = path.lastIndexOf('/');
  if (idx <= 0) return;
  fs.mkdirSync(path.slice(0, idx), { recursive: true });
}

function main() {
  const cfg = parseArgs(process.argv);
  const data = JSON.parse(fs.readFileSync(cfg.input, 'utf8'));
  if (!Array.isArray(data)) {
    throw new Error('Input JSON must be an array of PR objects.');
  }

  const classified = data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    updatedAt: pr.updatedAt,
    url: pr.url,
    ...classify(pr, cfg),
  }));

  const close = classified.filter((x) => x.action === 'close');
  const warn = classified.filter((x) => x.action === 'warn');
  const keep = classified.filter((x) => x.action === 'keep');
  const manual = classified.filter((x) => x.action === 'needs_manual_review');

  const plan = {
    generatedAt: new Date().toISOString(),
    policy: {
      staleDays: cfg.staleDays,
      warnDays: cfg.warnDays,
      keepaliveLabels: cfg.keepaliveLabels,
      batchSize: cfg.batchSize,
    },
    summary: {
      total: classified.length,
      close: close.length,
      warn: warn.length,
      keep: keep.length,
      needs_manual_review: manual.length,
    },
    batches: {
      close: chunk(close, cfg.batchSize),
      warn: chunk(warn, cfg.batchSize),
    },
    prs: classified,
    cannedComments: {
      close_stale_180: 'Closing as stale (>180 days inactivity) to restore a healthy merge conveyor. Reopen when rebased on current main and ready for merge queue.',
      warn_rebase_14d: 'This PR has been inactive for 90+ days. Please rebase onto current main and rerun required checks. Without updates in 14 days, it will be closed as stale.',
    },
  };

  ensureDir(cfg.output);
  fs.writeFileSync(cfg.output, `${JSON.stringify(plan, null, 2)}\n`);

  console.log(`Triage plan written to ${cfg.output}`);
  console.log(JSON.stringify(plan.summary));
}

main();
