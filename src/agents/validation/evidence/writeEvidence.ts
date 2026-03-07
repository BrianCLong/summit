import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  EvidenceBundleInput,
  EvidenceIndex,
  EvidenceIndexEntry,
  EvidenceIndexItem,
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
  items: [],
});

const upsertIndexEntry = (
  index: EvidenceIndex,
  entry: EvidenceIndexEntry,
): EvidenceIndex => {
  const nextEntries = index.entries.filter(
    (existing) => existing.evidence_id !== entry.evidence_id,
  );
  nextEntries.push(entry);
  nextEntries.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
  return { ...index, entries: nextEntries };
};

const upsertIndexItem = (
  index: EvidenceIndex,
  item: EvidenceIndexItem,
): EvidenceIndex => {
  const nextItems = index.items.filter(
    (existing) => existing.evidence_id !== item.evidence_id,
  );
  nextItems.push(item);
  nextItems.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
  return { ...index, items: nextItems };
};

const normalizeIndex = (raw: unknown): EvidenceIndex => {
  if (!raw || typeof raw !== 'object') {
    return createIndex();
  }
  const data = raw as Record<string, unknown>;
  const version = typeof data.version === 'number' ? data.version : 1;

  const entries = Array.isArray(data.entries)
    ? (data.entries as EvidenceIndexEntry[])
    : [];

  const items = Array.isArray(data.items)
    ? (data.items as EvidenceIndexItem[])
    : [];

  return {
    version,
    entries,
    items,
  };
};

const loadIndex = async (indexPath: string): Promise<EvidenceIndex> => {
  try {
    const raw = await readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return normalizeIndex(parsed);
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

  const entry: EvidenceIndexEntry = {
    evidence_id: input.report.evidence_id,
    paths: [
      path.join(input.runId, 'report.json'),
      path.join(input.runId, 'metrics.json'),
      path.join(input.runId, 'stamp.json'),
    ],
  };

  const item: EvidenceIndexItem = {
    evidence_id: input.report.evidence_id,
    files: {
      report: path.join(input.runId, 'report.json'),
      metrics: path.join(input.runId, 'metrics.json'),
      stamp: path.join(input.runId, 'stamp.json'),
    },
  };

  const loadedIndex = await loadIndex(indexPath);
  const withEntry = upsertIndexEntry(loadedIndex, entry);
  const nextIndex = upsertIndexItem(withEntry, item);

  await writeFile(indexPath, formatJson(nextIndex), 'utf8');

  return {
    index: nextIndex,
    report: input.report,
    metrics: input.metrics,
    stamp,
  };
};
