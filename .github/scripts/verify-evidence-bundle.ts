import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

type EvidenceIndex = {
  item: string;
  evidence: Array<{
    id: string;
    files: string[];
  }>;
};

type SchemaMap = Record<string, string>;

type ValidationError = {
  message: string;
  details?: string;
};

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'evidence', 'AGENTIC-HYBRID-PROV');
const INDEX_PATH = path.join(EVIDENCE_DIR, 'index.json');

const SCHEMAS: SchemaMap = {
  index: path.join(ROOT, 'evidence', 'schemas', 'agentic-hybrid-prov-index.schema.json'),
  report: path.join(ROOT, 'evidence', 'schemas', 'agentic-hybrid-prov-report.schema.json'),
  metrics: path.join(ROOT, 'evidence', 'schemas', 'agentic-hybrid-prov-metrics.schema.json'),
  stamp: path.join(ROOT, 'evidence', 'schemas', 'agentic-hybrid-prov-stamp.schema.json')
};

const ISO8601_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/;

const fileLabel = (filePath: string) => path.relative(ROOT, filePath);

const loadJson = async <T>(filePath: string): Promise<T> => {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
};

const loadSchema = async (filePath: string) => loadJson(filePath);

const detectEvidenceType = (filePath: string): keyof typeof SCHEMAS | null => {
  const base = path.basename(filePath);
  if (base === 'index.json') {
    return 'index';
  }
  if (base === 'report.json') {
    return 'report';
  }
  if (base === 'metrics.json') {
    return 'metrics';
  }
  if (base === 'stamp.json') {
    return 'stamp';
  }
  return null;
};

const validateWithSchema = async (
  ajv: Ajv,
  schemaPath: string,
  data: unknown,
  label: string,
  errors: ValidationError[]
) => {
  const schema = await loadSchema(schemaPath);
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    errors.push({
      message: `Schema validation failed for ${label}.`,
      details: JSON.stringify(validate.errors, null, 2)
    });
  }
};

const scanForTimestamps = (label: string, raw: string, errors: ValidationError[]) => {
  if (ISO8601_PATTERN.test(raw)) {
    errors.push({
      message: `Timestamp detected outside stamp.json in ${label}.`
    });
  }
};

const computeChangedFiles = (): string[] => {
  const baseRef = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : 'origin/main';
  try {
    const diff = execSync(`git diff --name-only ${baseRef}...HEAD`, {
      stdio: ['ignore', 'pipe', 'pipe']
    })
      .toString()
      .trim();
    return diff ? diff.split('\n') : [];
  } catch (error) {
    throw new Error(
      `Unable to compute git diff against ${baseRef}. Ensure the base ref is fetched. (${String(
        error
      )})`
    );
  }
};

const enforceDependencyDelta = (changedFiles: string[], errors: ValidationError[]) => {
  const dependencyFiles = new Set([
    'package.json',
    'pnpm-lock.yaml',
    'package-lock.json',
    'npm-shrinkwrap.json',
    'yarn.lock'
  ]);
  const dependencyChanged = changedFiles.some((file) => dependencyFiles.has(file));
  const deltaUpdated = changedFiles.includes('DEPENDENCY_DELTA.md');
  if (dependencyChanged && !deltaUpdated) {
    errors.push({
      message:
        'Dependency files changed without updating DEPENDENCY_DELTA.md per policy.'
    });
  }
};

const main = async () => {
  const errors: ValidationError[] = [];
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const indexRaw = await readFile(INDEX_PATH, 'utf8');
  const indexJson = JSON.parse(indexRaw) as EvidenceIndex;

  await validateWithSchema(ajv, SCHEMAS.index, indexJson, 'index.json', errors);
  scanForTimestamps(fileLabel(INDEX_PATH), indexRaw, errors);

  for (const entry of indexJson.evidence) {
    for (const file of entry.files) {
      const fullPath = path.join(ROOT, file);
      const label = fileLabel(fullPath);
      const evidenceType = detectEvidenceType(fullPath);
      if (!evidenceType || evidenceType === 'index') {
        errors.push({ message: `Unsupported evidence file ${label}.` });
        continue;
      }
      const raw = await readFile(fullPath, 'utf8');
      const jsonData = JSON.parse(raw) as unknown;
      await validateWithSchema(ajv, SCHEMAS[evidenceType], jsonData, label, errors);
      if (evidenceType !== 'stamp') {
        scanForTimestamps(label, raw, errors);
      }
    }
  }

  const changedFiles = computeChangedFiles();
  enforceDependencyDelta(changedFiles, errors);

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`ERROR: ${err.message}`);
      if (err.details) {
        console.error(err.details);
      }
    }
    process.exit(1);
  }

  console.log('SummitEvidenceGate: evidence bundle verification passed.');
};

main().catch((error) => {
  console.error(`ERROR: ${String(error)}`);
  process.exit(1);
});
