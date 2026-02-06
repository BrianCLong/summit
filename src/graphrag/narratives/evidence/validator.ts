import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import { fileURLToPath } from 'node:url';

const TIMESTAMP_FIELDS = new Set([
  'timestamp',
  'generated_at',
  'generatedAt',
  'ts',
]);

type EvidenceSchemas = {
  index: object;
  report: object;
  metrics: object;
  stamp: object;
};

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function loadSchema(schemaPath: string) {
  return readJson(schemaPath) as object;
}

function resolveSchemaDir() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, 'schemas');
}

function loadSchemas(): EvidenceSchemas {
  const schemaDir = resolveSchemaDir();
  return {
    index: loadSchema(path.join(schemaDir, 'evidence-index.schema.json')),
    report: loadSchema(path.join(schemaDir, 'report.schema.json')),
    metrics: loadSchema(path.join(schemaDir, 'metrics.schema.json')),
    stamp: loadSchema(path.join(schemaDir, 'stamp.schema.json')),
  };
}

function collectTimestampKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const entries = Object.entries(value as Record<string, unknown>);
  return entries.flatMap(([key, child]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    const matches = TIMESTAMP_FIELDS.has(key) ? [keyPath] : [];
    return matches.concat(collectTimestampKeys(child, keyPath));
  });
}

function createAjv() {
  return new Ajv({
    allErrors: true,
    strict: true,
  });
}

function assertValid(ajv: Ajv, schema: object, payload: unknown, label: string) {
  const validate = ajv.compile(schema);
  if (!validate(payload)) {
    const errors = validate.errors?.map((error) => {
      return `${error.instancePath || '/'} ${error.message || 'invalid'}`;
    });
    throw new Error(`Evidence schema validation failed for ${label}: ${errors?.join('; ')}`);
  }
}

function assertNoTimestampKeys(payload: unknown, label: string) {
  const keys = collectTimestampKeys(payload);
  if (keys.length > 0) {
    throw new Error(`Timestamp-like keys found in ${label}: ${keys.join(', ')}`);
  }
}

export type VerifyEvidenceOptions = {
  rootDir: string;
  indexPath?: string;
};

export function verifyEvidenceBundle({ rootDir, indexPath }: VerifyEvidenceOptions) {
  const resolvedIndexPath = indexPath ?? path.join(rootDir, 'evidence', 'index.json');
  if (!fs.existsSync(resolvedIndexPath)) {
    return { ok: false, reason: 'missing-index' } as const;
  }

  const schemas = loadSchemas();
  const ajv = createAjv();

  const index = readJson(resolvedIndexPath);
  assertValid(ajv, schemas.index, index, 'evidence/index.json');

  const entries = (index as { entries: Array<{ id: string; path: string }> }).entries;
  for (const entry of entries) {
    const evidenceDir = path.resolve(rootDir, entry.path);
    const reportPath = path.join(evidenceDir, 'report.json');
    const metricsPath = path.join(evidenceDir, 'metrics.json');
    const stampPath = path.join(evidenceDir, 'stamp.json');

    for (const requiredPath of [reportPath, metricsPath, stampPath]) {
      if (!fs.existsSync(requiredPath)) {
        throw new Error(`Missing required evidence file: ${requiredPath}`);
      }
    }

    const report = readJson(reportPath);
    const metrics = readJson(metricsPath);
    const stamp = readJson(stampPath);

    assertValid(ajv, schemas.report, report, `${entry.id}/report.json`);
    assertValid(ajv, schemas.metrics, metrics, `${entry.id}/metrics.json`);
    assertValid(ajv, schemas.stamp, stamp, `${entry.id}/stamp.json`);

    assertNoTimestampKeys(report, `${entry.id}/report.json`);
    assertNoTimestampKeys(metrics, `${entry.id}/metrics.json`);
  }

  return { ok: true } as const;
}
