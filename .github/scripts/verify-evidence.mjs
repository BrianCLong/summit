import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const DEFAULT_SCHEMA_DIR = path.join('docs', 'governance', 'evidence', 'schemas');

const TIMESTAMP_VALUE_PATTERNS = [
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/,
  /\b\d{4}-\d{2}-\d{2}\b/,
];

function isLikelyEpoch(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value >= 946684800000 && value <= 4102444800000) return true;
  if (value >= 946684800 && value <= 4102444800) return true;
  return false;
}

function isLikelyEpochString(value) {
  if (typeof value !== 'string') return false;
  const matches = value.match(/\b1\d{9,12}\b/g);
  if (!matches) return false;
  return matches.some((match) => {
    const numeric = Number(match);
    return Number.isFinite(numeric) && isLikelyEpoch(numeric);
  });
}

function isTimestampValue(value) {
  if (typeof value !== 'string') return false;
  if (TIMESTAMP_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return true;
  return isLikelyEpochString(value);
}

function scanTimestampValues(value, prefix = '') {
  let matches = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      matches.push(...scanTimestampValues(entry, `${prefix}[${index}]`));
    });
    return matches;
  }
  if (value === null || value === undefined) return matches;
  if (typeof value === 'string') {
    if (isTimestampValue(value) && prefix) matches.push(prefix);
    return matches;
  }
  if (typeof value === 'number') {
    if (isLikelyEpoch(value) && prefix) matches.push(prefix);
    return matches;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = prefix ? `${prefix}.${key}` : key;
      matches.push(...scanTimestampValues(child, nextPath));
    }
  }
  return matches;
}

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function resolveFromRoot(rootDir, target) {
  if (path.isAbsolute(target)) return target;
  return path.join(rootDir, target);
}

function loadSchema(schemaDir, name) {
  const schemaPath = path.join(schemaDir, name);
  return loadJson(schemaPath);
}

function formatAjvErrors(errors) {
  if (!errors || errors.length === 0) return [];
  return errors.map((error) => `${error.instancePath || '/'} ${error.message}`.trim());
}

export function verifyEvidence({ rootDir = process.cwd(), schemaDir = DEFAULT_SCHEMA_DIR } = {}) {
  const indexPath = path.join(rootDir, 'evidence', 'index.json');
  const errors = [];
  const resolvedSchemaDir = path.isAbsolute(schemaDir) ? schemaDir : path.join(rootDir, schemaDir);
  if (!fs.existsSync(indexPath)) {
    return { ok: false, errors: [`Missing evidence index at ${indexPath}`] };
  }

  const index = loadJson(indexPath);
  if (!Array.isArray(index.items)) {
    return { ok: false, errors: ['evidence/index.json must contain an items array'] };
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const reportSchema = loadSchema(resolvedSchemaDir, 'report.schema.json');
  const metricsSchema = loadSchema(resolvedSchemaDir, 'metrics.schema.json');
  const stampSchema = loadSchema(resolvedSchemaDir, 'stamp.schema.json');
  const validators = {
    report: ajv.compile(reportSchema),
    metrics: ajv.compile(metricsSchema),
    stamp: ajv.compile(stampSchema),
  };

  const missingFiles = [];
  for (const item of index.items) {
    if (!item || typeof item !== 'object') {
      errors.push('Evidence item must be an object');
      continue;
    }
    if (!item.evidence_id || typeof item.evidence_id !== 'string') {
      errors.push('Evidence item missing evidence_id');
      continue;
    }
    if (!item.files || typeof item.files !== 'object') {
      errors.push(`Evidence item ${item.evidence_id} missing files map`);
      continue;
    }
    for (const [kind, relPath] of Object.entries(item.files)) {
      if (!relPath || typeof relPath !== 'string') {
        errors.push(`Evidence item ${item.evidence_id} missing path for ${kind}`);
        continue;
      }
      const resolved = resolveFromRoot(rootDir, relPath);
      if (!fs.existsSync(resolved)) {
        missingFiles.push(`${item.evidence_id}:${kind}:${relPath}`);
        continue;
      }
      const payload = loadJson(resolved);
      const validator = validators[kind];
      if (validator && !validator(payload)) {
        const validationErrors = formatAjvErrors(validator.errors);
        errors.push(`Schema validation failed for ${relPath}: ${validationErrors.join('; ')}`);
      }
      if (kind !== 'stamp') {
        const timestampHits = scanTimestampValues(payload);
        if (timestampHits.length > 0) {
          errors.push(`Timestamp values found outside stamp.json in ${relPath}: ${timestampHits.join(', ')}`);
        }
      }
    }
  }

  if (missingFiles.length > 0) {
    errors.push(`Missing evidence files: ${missingFiles.join(', ')}`);
  }

  return { ok: errors.length === 0, errors };
}

function printSummary(result) {
  if (result.ok) {
    console.log('Evidence validation passed.');
    return;
  }
  console.error('Evidence validation failed:');
  result.errors.forEach((error) => {
    console.error(`- ${error}`);
  });
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  const result = verifyEvidence();
  printSummary(result);
  process.exit(result.ok ? 0 : 1);
}
