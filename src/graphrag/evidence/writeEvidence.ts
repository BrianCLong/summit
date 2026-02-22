import { promises as fs } from 'fs';
import path from 'path';

export type EvidenceStamp = {
  schemaVersion: string;
  runId: string;
  generatedAt: string;
};

export type EvidenceIndexEntry = {
  evidenceId: string;
  files: string[];
};

export type EvidenceBundle = {
  report: unknown;
  metrics: unknown;
  stamp: EvidenceStamp;
  index: EvidenceIndexEntry[];
};

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date);

const canonicalizeArray = (values: unknown[]): unknown[] => {
  const normalized = values.map((item) => canonicalizeJson(item));
  return normalized
    .slice()
    .sort((a, b) =>
      stringifyCanonicalJson(a).localeCompare(stringifyCanonicalJson(b)),
    );
};

export const canonicalizeJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return canonicalizeArray(value);
  }
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalizeJson(value[key]);
        return acc;
      }, {});
  }
  return value;
};

export const stringifyCanonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalizeJson(value), null, 2);

const collectTimestampStrings = (value: unknown, paths: string[], pathSoFar: string) => {
  if (typeof value === 'string') {
    if (ISO_TIMESTAMP.test(value)) {
      paths.push(pathSoFar);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectTimestampStrings(entry, paths, `${pathSoFar}[${index}]`),
    );
    return;
  }
  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, entry]) =>
      collectTimestampStrings(entry, paths, `${pathSoFar}.${key}`),
    );
  }
};

export const assertNoTimestampsOutsideStamp = (bundle: EvidenceBundle) => {
  const timestampPaths: string[] = [];
  collectTimestampStrings(bundle.report, timestampPaths, 'report');
  collectTimestampStrings(bundle.metrics, timestampPaths, 'metrics');
  collectTimestampStrings(bundle.index, timestampPaths, 'index');
  if (timestampPaths.length > 0) {
    throw new Error(
      `Timestamps must appear only in stamp.json. Found: ${timestampPaths.join(', ')}`,
    );
  }
};

export const validateDeterminism = (bundle: EvidenceBundle) => {
  if (!bundle.stamp?.generatedAt) {
    throw new Error('stamp.generatedAt is required for evidence bundles.');
  }
  assertNoTimestampsOutsideStamp(bundle);
};

export const writeEvidenceBundle = async (
  bundle: EvidenceBundle,
  outputDir: string,
) => {
  validateDeterminism(bundle);
  await fs.mkdir(outputDir, { recursive: true });
  const evidenceDir = path.join(outputDir, 'evidence');
  await fs.mkdir(evidenceDir, { recursive: true });
  await Promise.all([
    fs.writeFile(
      path.join(outputDir, 'report.json'),
      stringifyCanonicalJson(bundle.report),
    ),
    fs.writeFile(
      path.join(outputDir, 'metrics.json'),
      stringifyCanonicalJson(bundle.metrics),
    ),
    fs.writeFile(
      path.join(outputDir, 'stamp.json'),
      stringifyCanonicalJson(bundle.stamp),
    ),
    fs.writeFile(
      path.join(evidenceDir, 'index.json'),
      stringifyCanonicalJson({ entries: canonicalizeArray(bundle.index) }),
    ),
  ]);
};
