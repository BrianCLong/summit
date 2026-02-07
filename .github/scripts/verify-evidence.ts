import fs from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const EVIDENCE_DIR = path.resolve(process.cwd(), 'evidence');
const SCHEMA_DIR = path.resolve(process.cwd(), 'docs/ga/evidence-schemas');

const EVIDENCE_FILES = {
  report: 'report.json',
  metrics: 'metrics.json',
  stamp: 'stamp.json',
  index: 'index.json',
};

type EvidenceMap = Record<keyof typeof EVIDENCE_FILES, unknown>;

type IndexItem = {
  evidence_id: string;
  files: {
    report: string;
    metrics: string;
    stamp: string;
    [key: string]: string;
  };
};

type EvidenceIndex = {
  version: number | string;
  items: IndexItem[];
};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaPaths = {
  report: path.join(SCHEMA_DIR, 'report.schema.json'),
  metrics: path.join(SCHEMA_DIR, 'metrics.schema.json'),
  stamp: path.join(SCHEMA_DIR, 'stamp.schema.json'),
  index: path.join(SCHEMA_DIR, 'index.schema.json'),
};

async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

function collectTimestampKeys(value: unknown, pointer: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectTimestampKeys(entry, [...pointer, String(index)]),
    );
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, entry]) => {
        const nextPointer = [...pointer, key];
        const matchesTimestampKey = key.toLowerCase().includes('timestamp');
        const nested = collectTimestampKeys(entry, nextPointer);
        return matchesTimestampKey ? [nextPointer.join('.')].concat(nested) : nested;
      },
    );
  }
  return [];
}

function collectEvidenceIds(value: unknown): string[] {
  const text = JSON.stringify(value);
  const matches = text.match(/EVD-ONESHO-[A-Z0-9-]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

async function assertFileExists(filePath: string): Promise<void> {
  await fs.access(filePath);
}

async function loadSchemas() {
  return {
    report: await readJson(schemaPaths.report),
    metrics: await readJson(schemaPaths.metrics),
    stamp: await readJson(schemaPaths.stamp),
    index: await readJson(schemaPaths.index),
  };
}

async function loadEvidence(): Promise<EvidenceMap> {
  const entries = await Promise.all(
    Object.entries(EVIDENCE_FILES).map(async ([key, fileName]) => {
      const filePath = path.join(EVIDENCE_DIR, fileName);
      await assertFileExists(filePath);
      const value = await readJson(filePath);
      return [key, value] as const;
    }),
  );

  return Object.fromEntries(entries) as EvidenceMap;
}

function validateSchema(name: string, schema: unknown, data: unknown) {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    const errors = validate.errors?.map((error) => `${error.instancePath} ${error.message}`);
    const detail = errors ? errors.join('; ') : 'Unknown schema error';
    throw new Error(`${name} schema validation failed: ${detail}`);
  }
}

async function ensureOneshotEvidenceIndex(
  index: EvidenceIndex,
  evidenceIds: string[],
) {
  if (evidenceIds.length === 0) {
    return;
  }

  const indexMap = new Map(
    index.items.map((item) => [item.evidence_id, item]),
  );

  const missingIds = evidenceIds.filter((id) => !indexMap.has(id));
  if (missingIds.length > 0) {
    throw new Error(
      `Evidence index missing entries for: ${missingIds.join(', ')}`,
    );
  }

  for (const evidenceId of evidenceIds) {
    const entry = indexMap.get(evidenceId);
    if (!entry) {
      continue;
    }
    const reportPath = path.resolve(process.cwd(), entry.files.report);
    const metricsPath = path.resolve(process.cwd(), entry.files.metrics);
    const stampPath = path.resolve(process.cwd(), entry.files.stamp);
    await assertFileExists(reportPath);
    await assertFileExists(metricsPath);
    await assertFileExists(stampPath);
  }
}

async function main() {
  const schemas = await loadSchemas();
  const evidence = await loadEvidence();

  validateSchema('report.json', schemas.report, evidence.report);
  validateSchema('metrics.json', schemas.metrics, evidence.metrics);
  validateSchema('stamp.json', schemas.stamp, evidence.stamp);
  validateSchema('index.json', schemas.index, evidence.index);

  const timestampKeys = [
    ...collectTimestampKeys(evidence.report),
    ...collectTimestampKeys(evidence.metrics),
    ...collectTimestampKeys(evidence.index),
  ];

  if (timestampKeys.length > 0) {
    throw new Error(
      `Timestamp keys must only exist in stamp.json. Found: ${timestampKeys.join(
        ', ',
      )}`,
    );
  }

  const evidenceIds = [
    ...collectEvidenceIds(evidence.report),
    ...collectEvidenceIds(evidence.metrics),
  ];

  await ensureOneshotEvidenceIndex(evidence.index as EvidenceIndex, evidenceIds);

  console.log('Evidence verification passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
