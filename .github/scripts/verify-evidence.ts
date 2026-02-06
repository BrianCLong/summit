import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

type VerifyOptions = {
  rootDir?: string;
  schemaDir?: string;
};

type EvidenceIndex = {
  version: number;
  items: Array<{
    evidence_id: string;
    files: {
      report: string;
      metrics: string;
      stamp: string;
    };
  }>;
};

const TIMESTAMP_KEYS = new Set([
  'timestamp',
  'generated_at',
  'generatedAt',
  'generated_at_utc',
  'ts',
]);

function readJson<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function collectTimestampKeys(
  input: unknown,
  found: string[] = [],
  prefix = ''
): string[] {
  if (!input || typeof input !== 'object') {
    return found;
  }

  for (const [key, value] of Object.entries(input)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (TIMESTAMP_KEYS.has(key)) {
      found.push(keyPath);
    }
    collectTimestampKeys(value, found, keyPath);
  }

  return found;
}

function resolveSchemaPath(schemaDir: string, filename: string): string {
  const schemaPath = path.join(schemaDir, filename);
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Missing schema file: ${schemaPath}`);
  }
  return schemaPath;
}

function validateSchema(
  ajv: Ajv,
  schemaPath: string,
  data: unknown,
  label: string
): void {
  const schema = readJson(schemaPath);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    const details = JSON.stringify(validate.errors, null, 2);
    throw new Error(`Schema validation failed for ${label}: ${details}`);
  }
}

export function verifyEvidence(options: VerifyOptions = {}): void {
  const rootDir = options.rootDir ?? process.cwd();
  const schemaDir =
    options.schemaDir ??
    path.join(process.cwd(), 'src/graphrag/narratives/evidence/schemas');
  const evidenceIndexPath = path.join(rootDir, 'evidence', 'index.json');

  if (!fs.existsSync(evidenceIndexPath)) {
    throw new Error(`Missing evidence index: ${evidenceIndexPath}`);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const indexSchemaPath = resolveSchemaPath(
    schemaDir,
    'evidence-index.schema.json'
  );
  const reportSchemaPath = resolveSchemaPath(schemaDir, 'report.schema.json');
  const metricsSchemaPath = resolveSchemaPath(schemaDir, 'metrics.schema.json');
  const stampSchemaPath = resolveSchemaPath(schemaDir, 'stamp.schema.json');

  const index = readJson<EvidenceIndex>(evidenceIndexPath);
  validateSchema(ajv, indexSchemaPath, index, 'evidence/index.json');

  for (const item of index.items) {
    const reportPath = path.join(rootDir, item.files.report);
    const metricsPath = path.join(rootDir, item.files.metrics);
    const stampPath = path.join(rootDir, item.files.stamp);

    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `Missing evidence report for ${item.evidence_id}: ${reportPath}`
      );
    }
    if (!fs.existsSync(metricsPath)) {
      throw new Error(
        `Missing evidence metrics for ${item.evidence_id}: ${metricsPath}`
      );
    }
    if (!fs.existsSync(stampPath)) {
      throw new Error(
        `Missing evidence stamp for ${item.evidence_id}: ${stampPath}`
      );
    }

    const reportJson = readJson(reportPath);
    const metricsJson = readJson(metricsPath);
    const stampJson = readJson(stampPath);

    validateSchema(ajv, reportSchemaPath, reportJson, reportPath);
    validateSchema(ajv, metricsSchemaPath, metricsJson, metricsPath);
    validateSchema(ajv, stampSchemaPath, stampJson, stampPath);

    const reportTimestamps = collectTimestampKeys(reportJson);
    if (reportTimestamps.length > 0) {
      throw new Error(
        `Timestamp keys found in ${reportPath}: ${reportTimestamps.join(', ')}`
      );
    }

    const metricsTimestamps = collectTimestampKeys(metricsJson);
    if (metricsTimestamps.length > 0) {
      throw new Error(
        `Timestamp keys found in ${metricsPath}: ${metricsTimestamps.join(', ')}`
      );
    }
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf('--root');
  const schemaIndex = args.indexOf('--schema-dir');
  const rootDir = rootIndex >= 0 ? args[rootIndex + 1] : undefined;
  const schemaDir = schemaIndex >= 0 ? args[schemaIndex + 1] : undefined;

  verifyEvidence({ rootDir, schemaDir });
  console.log('verify-evidence: OK');
}

main();
