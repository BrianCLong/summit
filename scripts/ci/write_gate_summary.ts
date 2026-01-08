#!/usr/bin/env -S npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { program } from 'commander';

const SummarySchema = z.object({
  gate_id: z.string(),
  run_id: z.string(),
  commit_sha: z.string(),
  timestamp: z.string(),
  outcome: z.enum(['PASS', 'FAIL', 'SKIPPED']),
  duration_seconds: z.number(),
  is_quarantine: z.boolean(),
  is_retry: z.boolean(),
  artifact_path: z.string().optional(),
});

program
  .requiredOption('--gate-id <id>', 'Gate ID')
  .requiredOption('--outcome <outcome>', 'Outcome: PASS, FAIL, SKIPPED')
  .requiredOption('--duration <seconds>', 'Duration in seconds')
  .option('--run-id <id>', 'CI Run ID', process.env.GITHUB_RUN_ID || 'unknown')
  .option('--commit <sha>', 'Commit SHA', process.env.GITHUB_SHA || 'unknown')
  .option('--quarantine', 'Was this a quarantine run?', false)
  .option('--retry', 'Was this a retry?', false)
  .option('--artifact-path <path>', 'Path to artifacts')
  .parse(process.argv);

const options = program.opts();

const summary = {
  gate_id: options.gateId,
  run_id: options.runId,
  commit_sha: options.commit,
  timestamp: new Date().toISOString(),
  outcome: options.outcome,
  duration_seconds: parseFloat(options.duration),
  is_quarantine: !!options.quarantine,
  is_retry: !!options.retry,
  artifact_path: options.artifactPath,
};

// Validate
const parsed = SummarySchema.safeParse(summary);
if (!parsed.success) {
  console.error('Invalid summary data:', parsed.error);
  process.exit(1);
}

// Write to dist/ci/gates/
const distDir = path.join(process.cwd(), 'dist/ci/gates');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const filename = `${options.gateId}.${options.runId}.summary.json`;
const filepath = path.join(distDir, filename);

fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
console.log(`Wrote summary to ${filepath}`);
