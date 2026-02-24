#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    input: 'docs/contracts/switchboard/examples/policy-coverage-sample.json',
    threshold: 90,
    out: '',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--input' && argv[i + 1]) {
      args.input = argv[++i];
      continue;
    }
    if (token === '--threshold' && argv[i + 1]) {
      args.threshold = Number(argv[++i]);
      continue;
    }
    if (token === '--out' && argv[i + 1]) {
      args.out = argv[++i];
      continue;
    }
  }

  return args;
}

function readJson(filePath) {
  const absolute = path.resolve(filePath);
  const raw = fs.readFileSync(absolute, 'utf8');
  return JSON.parse(raw);
}

function validateInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('input must be an object');
  }
  if (!Array.isArray(input.flows)) {
    throw new Error('input.flows must be an array');
  }
  for (const flow of input.flows) {
    if (!flow || typeof flow !== 'object') {
      throw new Error('each flow must be an object');
    }
    if (typeof flow.id !== 'string' || flow.id.length === 0) {
      throw new Error('each flow must include id');
    }
    if (typeof flow.privileged !== 'boolean') {
      throw new Error(`flow ${flow.id} missing privileged boolean`);
    }
    if (typeof flow.covered !== 'boolean') {
      throw new Error(`flow ${flow.id} missing covered boolean`);
    }
  }
}

function computeCoverage(input) {
  const privileged = input.flows.filter((flow) => flow.privileged);
  const covered = privileged.filter((flow) => flow.covered);
  const uncoveredFlowIds = privileged
    .filter((flow) => !flow.covered)
    .map((flow) => flow.id)
    .sort((a, b) => a.localeCompare(b));

  const coveragePercent = privileged.length === 0
    ? 100
    : Number(((covered.length / privileged.length) * 100).toFixed(2));

  return {
    bundleVersion: input.bundleVersion ?? 'unknown',
    privilegedFlowCount: privileged.length,
    coveredPrivilegedFlowCount: covered.length,
    coveragePercent,
    uncoveredFlowIds,
  };
}

function main() {
  const { input, threshold, out } = parseArgs(process.argv);
  if (Number.isNaN(threshold) || threshold <= 0 || threshold > 100) {
    throw new Error('threshold must be > 0 and <= 100');
  }

  const payload = readJson(input);
  validateInput(payload);
  const report = computeCoverage(payload);

  if (out) {
    fs.writeFileSync(path.resolve(out), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.coveragePercent < threshold) {
    process.stderr.write(
      `coverage gate failed: ${report.coveragePercent}% < threshold ${threshold}%\n`,
    );
    process.exitCode = 2;
  }
}

main();
