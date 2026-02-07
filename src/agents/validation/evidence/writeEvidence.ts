import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  EvidenceBundleInput,
  EvidenceIndex,
  EvidenceIndexEntry,
  EvidenceMetrics,
  EvidenceReport,
  EvidenceStamp,
} from './types';

const DEFAULT_BASE_DIR = 'evidence';

const formatJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;

const createIndex = (): EvidenceIndex => ({
  version: 1,
  entries: [],
});

const upsertIndexEntry = (
  index: EvidenceIndex,
  entry: EvidenceIndexEntry,
): EvidenceIndex => {
  const nextEntries = index.entries.filter(
    (existing) => existing.evidence_id !== entry.evidence_id,
  );
  nextEntries.push(entry);
  return { ...index, entries: nextEntries };
};

const loadIndex = async (indexPath: string): Promise<EvidenceIndex> => {
  try {
    const raw = await readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as EvidenceIndex;
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return createIndex();
    }
    throw error;
  }
};

export const writeEvidenceBundle = async (
  input: EvidenceBundleInput,
): Promise<{
  index: EvidenceIndex;
  report: EvidenceReport;
  metrics: EvidenceMetrics;
  stamp: EvidenceStamp;
}> => {
  const baseDir = input.baseDir ?? DEFAULT_BASE_DIR;
  const runDir = path.join(baseDir, input.runId);
  await mkdir(runDir, { recursive: true });

  const reportPath = path.join(runDir, 'report.json');
  const metricsPath = path.join(runDir, 'metrics.json');
  const stampPath = path.join(runDir, 'stamp.json');
  const indexPath = path.join(baseDir, 'index.json');

  const stamp: EvidenceStamp = {
    created_at: input.createdAt ?? new Date().toISOString(),
  };

  await writeFile(reportPath, formatJson(input.report), 'utf8');
  await writeFile(metricsPath, formatJson(input.metrics), 'utf8');
  await writeFile(stampPath, formatJson(stamp), 'utf8');

  const index = await loadIndex(indexPath);
  const entry: EvidenceIndexEntry = {
    evidence_id: input.report.evidence_id,
    paths: [
      path.join(input.runId, 'report.json'),
      path.join(input.runId, 'metrics.json'),
      path.join(input.runId, 'stamp.json'),
    ],
  };
  const nextIndex = upsertIndexEntry(index, entry);
  await writeFile(indexPath, formatJson(nextIndex), 'utf8');

  return {
    index: nextIndex,
    report: input.report,
    metrics: input.metrics,
    stamp,
  };
};
