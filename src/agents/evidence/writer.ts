import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface EvidenceReport {
  id: string;
  area: string;
  summary: string;
  evidenceIds?: string[];
}

export interface EvidenceMetrics {
  metrics: Record<string, number>;
}

export interface EvidenceStamp {
  generated_at_iso: string;
}

export interface EvidenceIndexEntry {
  evidenceId: string;
  files: {
    report: string;
    metrics: string;
    stamp: string;
  };
}

export interface EvidenceIndex {
  version: number;
  items: EvidenceIndexEntry[];
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value), null, 2);
}

export function writeEvidence(
  runDir: string,
  report: EvidenceReport,
  metrics: EvidenceMetrics,
  stamp: EvidenceStamp,
): void {
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'report.json'), stableStringify(report));
  writeFileSync(join(runDir, 'metrics.json'), stableStringify(metrics));
  writeFileSync(join(runDir, 'stamp.json'), stableStringify(stamp));
}

export function writeEvidenceIndex(
  indexPath: string,
  index: EvidenceIndex,
): void {
  writeFileSync(indexPath, stableStringify(index));
}
