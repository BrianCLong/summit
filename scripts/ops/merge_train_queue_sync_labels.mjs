#!/usr/bin/env node

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

import { QUEUE_LABELS, buildPlan } from './merge_train_queue_planner.mjs';

const ALL_QUEUE_LABELS = Object.values(QUEUE_LABELS);

function parseArgs(argv) {
  const args = {
    input: '',
    batchSize: 25,
    staleDays: 45,
    now: new Date(),
    apply: false,
    repo: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[i + 1] ?? '';
    if (arg === '--batch-size') args.batchSize = Number(argv[i + 1] ?? '25');
    if (arg === '--stale-days') args.staleDays = Number(argv[i + 1] ?? '45');
    if (arg === '--now') args.now = new Date(argv[i + 1] ?? '');
    if (arg === '--repo') args.repo = argv[i + 1] ?? '';
    if (arg === '--apply') args.apply = true;
  }

  if (!args.input) {
    throw new Error('Missing --input <path-to-open-prs.json>');
  }

  return args;
}

function normalizeLabels(pr) {
  if (!Array.isArray(pr.labels)) return [];
  return pr.labels
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function buildLabelOperation(pr, targetQueueLabel) {
  const existingLabels = uniqueSorted(normalizeLabels(pr));
  const queueLabelsOnPr = existingLabels.filter((label) => ALL_QUEUE_LABELS.includes(label));

  const removeLabels = queueLabelsOnPr.filter((label) => label !== targetQueueLabel);
  const addLabels = existingLabels.includes(targetQueueLabel) ? [] : [targetQueueLabel];

  if (addLabels.length === 0 && removeLabels.length === 0) return null;

  return {
    number: pr.number,
    title: pr.title,
    targetQueueLabel,
    addLabels,
    removeLabels: uniqueSorted(removeLabels),
  };
}

function buildLabelOperations(openPrs, options) {
  const plan = buildPlan(openPrs, options);
  const targetByPrNumber = new Map();

  for (const [queueLabel, prs] of Object.entries(plan.buckets)) {
    for (const pr of prs) {
      targetByPrNumber.set(pr.number, queueLabel);
    }
  }

  const operations = openPrs
    .map((pr) => buildLabelOperation(pr, targetByPrNumber.get(pr.number) ?? QUEUE_LABELS.blocked))
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);

  return {
    plan,
    operations,
  };
}

function buildGhArgs(operation, repo) {
  const args = ['pr', 'edit', String(operation.number)];

  if (repo) {
    args.push('--repo', repo);
  }

  if (operation.addLabels.length > 0) {
    args.push('--add-label', operation.addLabels.join(','));
  }

  if (operation.removeLabels.length > 0) {
    args.push('--remove-label', operation.removeLabels.join(','));
  }

  return args;
}

function applyOperations(operations, repo) {
  for (const operation of operations) {
    execFileSync('gh', buildGhArgs(operation, repo), { stdio: 'inherit' });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = fs.readFileSync(args.input, 'utf8');
  const openPrs = JSON.parse(raw);

  if (!Array.isArray(openPrs)) {
    throw new Error('Input JSON must be an array of pull requests.');
  }

  const { plan, operations } = buildLabelOperations(openPrs, args);

  if (args.apply) {
    applyOperations(operations, args.repo);
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        mode: args.apply ? 'apply' : 'dry-run',
        queueCounts: plan.queueCounts,
        nextBatch: plan.nextBatch,
        operationCount: operations.length,
        operations,
      },
      null,
      2,
    )}\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildGhArgs, buildLabelOperation, buildLabelOperations, normalizeLabels, parseArgs };
