import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

export type EvidenceIndexEntry = { path: string; kind: string };
export type EvidenceIndex = Record<string, EvidenceIndexEntry>;

const TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const ALLOWED_KINDS = new Set([
  'plan',
  'work',
  'assess',
  'memory',
  'compound',
  'metrics',
  'stamp',
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaDir = path.join(__dirname, 'schemas');

function loadSchema(schemaFile: string): unknown {
  const filePath = path.join(schemaDir, schemaFile);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function createValidator(): {
  ajv: Ajv;
  schemas: Record<string, ValidateFunction>;
} {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);

  const reportSchema = loadSchema('report.schema.json');
  const metricsSchema = loadSchema('metrics.schema.json');
  const stampSchema = loadSchema('stamp.schema.json');
  const indexSchema = loadSchema('index.schema.json');

  const schemas: Record<string, ValidateFunction> = {
    report: ajv.compile(reportSchema),
    metrics: ajv.compile(metricsSchema),
    stamp: ajv.compile(stampSchema),
    index: ajv.compile(indexSchema),
  };

  return { ajv, schemas };
}

function readJson(filePath: string, errors: string[]): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to read JSON at ${filePath}: ${message}`);
    return null;
  }
}

function containsTimestampLikeValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return TIMESTAMP_PATTERN.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsTimestampLikeValue(entry));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => containsTimestampLikeValue(entry));
  }
  return false;
}

function validateSchema(
  validator: ValidateFunction,
  payload: unknown,
  label: string,
  errors: string[],
): void {
  const valid = validator(payload);
  if (!valid) {
    const detail = validator.errors?.map((err) => `${err.instancePath} ${err.message}`);
    errors.push(`Schema validation failed for ${label}: ${detail?.join('; ')}`);
  }
}

function resolveEvidencePath(bundleDir: string, relativePath: string): string | null {
  if (path.isAbsolute(relativePath) || relativePath.includes('..')) {
    return null;
  }
  const resolved = path.resolve(bundleDir, relativePath);
  if (!resolved.startsWith(path.resolve(bundleDir))) {
    return null;
  }
  return resolved;
}

export function validateEvidenceBundle(bundleDir: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const { schemas } = createValidator();

  const indexPath = path.join(bundleDir, 'index.json');
  const indexPayload = readJson(indexPath, errors);

  if (!indexPayload) {
    return { valid: false, errors };
  }

  validateSchema(schemas.index, indexPayload, 'index.json', errors);

  if (!indexPayload || typeof indexPayload !== 'object' || Array.isArray(indexPayload)) {
    errors.push('index.json must be an object map of evidence entries.');
    return { valid: false, errors };
  }

  const evidenceIndex = indexPayload as EvidenceIndex;
  const validatedFiles = new Set<string>();

  for (const [evidenceId, entry] of Object.entries(evidenceIndex)) {
    if (!entry || typeof entry !== 'object') {
      errors.push(`Evidence entry ${evidenceId} must be an object.`);
      continue;
    }

    if (!ALLOWED_KINDS.has(entry.kind)) {
      errors.push(`Evidence entry ${evidenceId} has unsupported kind: ${entry.kind}`);
      continue;
    }

    const resolvedPath = resolveEvidencePath(bundleDir, entry.path);
    if (!resolvedPath) {
      errors.push(`Evidence entry ${evidenceId} has invalid path: ${entry.path}`);
      continue;
    }

    if (validatedFiles.has(resolvedPath)) {
      continue;
    }
    validatedFiles.add(resolvedPath);

    const payload = readJson(resolvedPath, errors);
    if (!payload) {
      continue;
    }

    const schemaKey = entry.kind === 'metrics' ? 'metrics' : entry.kind === 'stamp' ? 'stamp' : 'report';
    validateSchema(schemas[schemaKey], payload, entry.path, errors);

    if (entry.kind !== 'stamp' && containsTimestampLikeValue(payload)) {
      errors.push(`Timestamp-like value found outside stamp.json in ${entry.path}.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
