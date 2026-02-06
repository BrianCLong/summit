import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const TIMESTAMP_KEYS = new Set([
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

const loadJson = (filePath: string) =>
  JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;

const scanForTimestampKeys = (
  value: unknown,
  currentPath = '',
  hits: string[] = [],
): string[] => {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanForTimestampKeys(item, `${currentPath}[${index}]`, hits),
    );
    return hits;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      if (TIMESTAMP_KEYS.has(key)) {
        hits.push(nextPath);
      }
      scanForTimestampKeys(val, nextPath, hits);
    });
  }

  return hits;
};

const ensureMetricKeys = (metrics: Record<string, unknown>, keys: string[]) => {
  const missing = keys.filter((key) => !(key in metrics));
  if (missing.length > 0) {
    throw new Error(
      `metrics.json missing required keys: ${missing.join(', ')}`,
    );
  }

  const metricKeySet = new Set(keys);
  const extras = Object.keys(metrics).filter((key) => !metricKeySet.has(key));
  if (extras.length > 0) {
    throw new Error(`metrics.json has unexpected keys: ${extras.join(', ')}`);
  }
};

const loadSchemas = (schemaDir: string): EvidenceSchemas => ({
  index: loadJson(path.join(schemaDir, 'evidence-index.schema.json')),
  report: loadJson(path.join(schemaDir, 'report.schema.json')),
  metrics: loadJson(path.join(schemaDir, 'metrics.schema.json')),
  stamp: loadJson(path.join(schemaDir, 'stamp.schema.json')),
});

export const validateEvidenceBundle = (evidenceDir: string) => {
  const indexPath = path.join(evidenceDir, 'index.json');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing evidence index at ${indexPath}`);
  }

  const schemaDir = path.resolve(
    'src/graphrag/narratives/evidence/schemas',
  );
  const schemas = loadSchemas(schemaDir);

  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);

  const index = loadJson(indexPath) as { entries?: Array<{ path: string }> };
  const validateIndex = ajv.compile(schemas.index);
  if (!validateIndex(index)) {
    throw new Error(
      `Evidence index schema invalid: ${ajv.errorsText(validateIndex.errors)}`,
    );
  }

  const timestampHits = scanForTimestampKeys(index);
  if (timestampHits.length > 0) {
    throw new Error(
      `Timestamp keys found in evidence index: ${timestampHits.join(', ')}`,
    );
  }

  const validateReport = ajv.compile(schemas.report);
  const validateMetrics = ajv.compile(schemas.metrics);
  const validateStamp = ajv.compile(schemas.stamp);

  for (const entry of index.entries ?? []) {
    const entryDir = path.join(evidenceDir, entry.path);
    const reportPath = path.join(entryDir, 'report.json');
    const metricsPath = path.join(entryDir, 'metrics.json');
    const stampPath = path.join(entryDir, 'stamp.json');

    [reportPath, metricsPath, stampPath].forEach((filePath) => {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required evidence file: ${filePath}`);
      }
    });

    const report = loadJson(reportPath);
    if (!validateReport(report)) {
      throw new Error(
        `report.json schema invalid: ${ajv.errorsText(validateReport.errors)}`,
      );
    }

    const metrics = loadJson(metricsPath) as {
      metricKeys?: string[];
      metrics?: Record<string, unknown>;
    };
    if (!validateMetrics(metrics)) {
      throw new Error(
        `metrics.json schema invalid: ${ajv.errorsText(validateMetrics.errors)}`,
      );
    }

    ensureMetricKeys(metrics.metrics ?? {}, metrics.metricKeys ?? []);

    const stamp = loadJson(stampPath);
    if (!validateStamp(stamp)) {
      throw new Error(
        `stamp.json schema invalid: ${ajv.errorsText(validateStamp.errors)}`,
      );
    }

    const forbiddenTimestampKeys = [
      ...scanForTimestampKeys(report),
      ...scanForTimestampKeys(metrics),
    ];
    if (forbiddenTimestampKeys.length > 0) {
      throw new Error(
        `Timestamp keys found outside stamp.json: ${forbiddenTimestampKeys.join(', ')}`,
      );
    }
  }
};
