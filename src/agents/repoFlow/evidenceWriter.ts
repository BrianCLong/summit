import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EvidenceMetrics, EvidenceReport, EvidenceStamp } from './types';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const sortKeys = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return entries.reduce<Record<string, JsonValue>>((acc, [key, val]) => {
      acc[key] = sortKeys(val as JsonValue);
      return acc;
    }, {});
  }
  return value;
};

export const stableStringify = (value: JsonValue): string =>
  JSON.stringify(sortKeys(value), null, 2) + '\n';

const writeJson = async (filePath: string, payload: JsonValue) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, stableStringify(payload), 'utf8');
};

export const writeEvidence = async (
  dir: string,
  report: EvidenceReport,
  metrics: EvidenceMetrics,
  stamp: EvidenceStamp,
) => {
  await writeJson(path.join(dir, 'report.json'), report);
  await writeJson(path.join(dir, 'metrics.json'), metrics);
  await writeJson(path.join(dir, 'stamp.json'), stamp);
};
