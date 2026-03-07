#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { ARTIFACT_DIR, getGitSha, writeArtifacts } from './common.mjs';

const APPROVED_TOOLS = [
  'graphql',
  'grafana',
  'jest',
  'neo4j',
  'opa',
  'opentelemetry',
  'playwright',
  'postgres',
  'prometheus',
  'react',
  'redis',
  'typescript',
  'vite',
  'vitest'
];

const args = process.argv.slice(2);
const manifestPath = parseArg(args, '--manifest') ?? '.summit/vibe_stack.json';
const schemaPath = parseArg(args, '--schema') ?? '.summit/vibe_stack.schema.json';

const report = {
  check: 'vibe:validate',
  manifestPath,
  schemaPath,
  status: 'passed',
  errors: [],
  warnings: [],
  violations: []
};

let schemaVersion = 'unknown';
let manifestSchemaVersion = 'unknown';

try {
  const schema = parseJson(schemaPath);
  const manifest = parseJson(manifestPath);
  schemaVersion = schema?.properties?.schemaVersion?.const ?? 'unknown';
  manifestSchemaVersion = manifest?.schemaVersion ?? 'unknown';

  validateRequiredPath(manifest, 'schemaVersion', report.errors);
  validateRequiredPath(manifest, 'stack', report.errors);
  validateRequiredPath(manifest, 'allowlist.tools', report.errors);
  validateRequiredPath(manifest, 'constraints.determinism.disallowTimestamps', report.errors);
  validateRequiredPath(manifest, 'constraints.determinism.stableOrdering', report.errors);
  validateRequiredPath(manifest, 'constraints.security.denyByDefault', report.errors);
  validateRequiredPath(manifest, 'constraints.security.neverLogSecrets', report.errors);

  const stackFields = [
    'ui',
    'api',
    'data',
    'auth',
    'observability',
    'testing',
    'deployment'
  ];
  for (const field of stackFields) {
    validateRequiredPath(manifest, `stack.${field}`, report.errors);
  }

  if (manifest.schemaVersion !== '1.0.0') {
    report.errors.push('schemaVersion must be 1.0.0');
    report.violations.push('schema-version-mismatch');
  }

  const tools = Array.isArray(manifest?.allowlist?.tools)
    ? [...manifest.allowlist.tools].sort()
    : [];

  if (tools.length === 0) {
    report.errors.push('allowlist.tools must contain at least one entry');
  }

  const duplicates = findDuplicates(tools);
  if (duplicates.length > 0) {
    report.errors.push(`Duplicate allowlist tools: ${duplicates.join(', ')}`);
  }

  const unapproved = tools.filter((tool) => !APPROVED_TOOLS.includes(tool));
  if (unapproved.length > 0) {
    report.errors.push(`Unapproved tooling detected: ${unapproved.join(', ')}`);
    report.violations.push('unapproved-tooling');
  }

  if (manifest?.constraints?.determinism?.disallowTimestamps !== true) {
    report.errors.push('constraints.determinism.disallowTimestamps must be true');
    report.violations.push('nondeterministic-stamp-risk');
  }

  report.errors.sort();
  report.violations = [...new Set(report.violations)].sort();
  report.status = report.errors.length > 0 ? 'failed' : 'passed';
} catch (error) {
  report.status = 'failed';
  report.errors.push(error instanceof Error ? error.message : String(error));
}

const metrics = {
  check: 'vibe:validate',
  artifactDir: ARTIFACT_DIR,
  errors: report.errors.length,
  warnings: report.warnings.length,
  violations: report.violations.length
};

const stamp = {
  gitSha: getGitSha(),
  manifestSchemaVersion,
  schemaVersion
};

writeArtifacts({ report, metrics, stamp });

if (report.status !== 'passed') {
  process.stderr.write('vibe:validate failed\n');
  process.exitCode = 1;
} else {
  process.stdout.write('vibe:validate passed\n');
}

function parseArg(argv, key) {
  const idx = argv.indexOf(key);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

function parseJson(path) {
  const text = readFileSync(path, 'utf8');
  return JSON.parse(text);
}

function validateRequiredPath(obj, dottedPath, errors) {
  const value = dottedPath.split('.').reduce((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in acc) {
      return acc[segment];
    }
    return undefined;
  }, obj);

  if (value === undefined || value === null || value === '') {
    errors.push(`Missing required field: ${dottedPath}`);
  }
}

function findDuplicates(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}
