import fs from 'node:fs';
import path from 'node:path';

import { sha256Hex } from '../hash';
import type { EvidenceIndex, EvidenceIndexEntry } from '../types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function writeJsonSorted(outputPath: string, payload: unknown): void {
  const sorted = sortKeysDeep(payload);
  const serialized = JSON.stringify(sorted, null, 2) + '\n';
  fs.writeFileSync(outputPath, serialized, 'utf8');
}

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  return sha256Hex(content);
}

export interface EvidenceBundleInput {
  report: unknown;
  metrics: unknown;
  stamp: unknown;
  index: EvidenceIndex;
}

export function buildEvidenceIndex(
  outputDir: string,
  entries: EvidenceIndexEntry[],
): EvidenceIndex {
  const normalized = entries.map((entry) => {
    const sha256: Record<string, string> = {};
    entry.files.forEach((file) => {
      const fullPath = path.join(outputDir, file);
      sha256[file] = hashFile(fullPath);
    });
    return { ...entry, sha256 };
  });

  return { entries: normalized };
}

export function writeEvidenceBundle(
  outputDir: string,
  bundle: EvidenceBundleInput,
): void {
  fs.mkdirSync(path.join(outputDir, 'evidence'), { recursive: true });

  writeJsonSorted(path.join(outputDir, 'report.json'), bundle.report);
  writeJsonSorted(path.join(outputDir, 'metrics.json'), bundle.metrics);
  writeJsonSorted(path.join(outputDir, 'stamp.json'), bundle.stamp);
  writeJsonSorted(
    path.join(outputDir, 'evidence', 'index.json'),
    bundle.index,
  );
}
