import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outputPath = outIndex >= 0 ? args[outIndex + 1] : 'artifacts/preflight-input.json';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const input = {
  tests: {
    failed: toNumber(process.env.PREFLIGHT_TESTS_FAILED),
  },
  lint: {
    errors: toNumber(process.env.PREFLIGHT_LINT_ERRORS),
  },
  security_findings: toNumber(process.env.PREFLIGHT_SECURITY_FINDINGS),
  required_evidence: process.env.PREFLIGHT_REQUIRED_EVIDENCE
    ? process.env.PREFLIGHT_REQUIRED_EVIDENCE.split(',').filter(Boolean)
    : [],
};

const resolvedPath = path.resolve(outputPath);
await mkdir(path.dirname(resolvedPath), { recursive: true });
await writeFile(resolvedPath, `${JSON.stringify(input, null, 2)}\n`, 'utf8');

process.stdout.write(`preflight input written to ${resolvedPath}\n`);
