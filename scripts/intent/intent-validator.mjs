import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import yaml from 'js-yaml';
import { minimatch } from 'minimatch';

const schemaPath = new URL('../../schemas/intent-spec.schema.json', import.meta.url);
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

export const SENSITIVE_GLOBS = [
  'server/src/auth/**',
  'server/src/authz/**',
  'server/src/policies/**',
  'server/src/policy/**',
  'server/src/crypto/**',
  'server/src/security/**',
  'server/src/db/**',
  'server/src/data/**',
  'server/src/payments/**',
  'server/src/billing/**',
  'server/src/finance/**',
  'server/src/middleware/opa.*',
  'packages/**/policy/**',
  'packages/**/auth/**',
  'infra/**',
  'k8s/**',
  'helm/**',
  'terraform/**',
  'docker-compose*.yml',
  '.github/workflows/**'
];

export function isSensitiveChange(changedFiles) {
  return changedFiles.some((file) =>
    SENSITIVE_GLOBS.some((glob) => minimatch(file, glob))
  );
}

export function loadIntentSpec(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.yaml' || ext === '.yml') {
    return yaml.load(raw);
  }

  if (ext === '.json') {
    return JSON.parse(raw);
  }

  throw new Error(`Unsupported intent spec extension: ${ext}`);
}

export function validateIntentSpec(data) {
  const valid = validate(data);
  return {
    valid,
    errors: valid ? [] : validate.errors ?? []
  };
}

export function validateIntentFile(filePath) {
  const data = loadIntentSpec(filePath);
  const result = validateIntentSpec(data);
  return { data, ...result };
}

export function listIntentFiles(intentDir) {
  if (!fs.existsSync(intentDir)) {
    return [];
  }

  return fs
    .readdirSync(intentDir)
    .filter((entry) => entry.endsWith('.yaml') || entry.endsWith('.yml') || entry.endsWith('.json'))
    .map((entry) => path.join(intentDir, entry));
}

export function formatAjvErrors(errors) {
  return errors.map((error) => {
    const instance = error.instancePath || '(root)';
    return `${instance} ${error.message}`.trim();
  });
}

export function evaluateChangeContracts(intent, changedFiles) {
  const findings = [];

  if (!isSensitiveChange(changedFiles)) {
    return findings;
  }

  if (!intent?.invariants || intent.invariants.length === 0) {
    findings.push('Sensitive change requires at least one invariant.');
  }

  const automatedTests = (intent?.acceptance_tests || []).filter(
    (test) => test.type === 'automated' && typeof test.command === 'string'
  );

  if (automatedTests.length === 0) {
    findings.push(
      'Sensitive change requires at least one automated acceptance test with a command.'
    );
  }

  return findings;
}
