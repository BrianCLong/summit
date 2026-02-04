import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

type EvidenceIndexItem = {
  id: string;
  path: string;
};

type EvidenceIndex = {
  version: 1;
  items: EvidenceIndexItem[];
};

type EvidenceArtifacts = {
  report: Record<string, unknown>;
  metrics: Record<string, unknown>;
  stamp: Record<string, unknown>;
};

const DEFAULT_INDEX: EvidenceIndex = {
  version: 1,
  items: [],
};

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return Object.fromEntries(entries.map(([key, nested]) => [key, sortValue(nested)]));
  }
  return value;
};

const serialize = (value: unknown): string =>
  `${JSON.stringify(sortValue(value), null, 2)}\n`;

const loadIndex = async (indexPath: string): Promise<EvidenceIndex> => {
  try {
    const raw = await readFile(indexPath, 'utf8');
    return JSON.parse(raw) as EvidenceIndex;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...DEFAULT_INDEX };
    }
    throw error;
  }
};

export const writeEvidenceArtifacts = async (
  baseDir: string,
  evidenceId: string,
  artifacts: EvidenceArtifacts,
): Promise<void> => {
  const evidenceDir = join(baseDir, evidenceId);
  await mkdir(evidenceDir, { recursive: true });

  await writeFile(join(evidenceDir, 'report.json'), serialize(artifacts.report));
  await writeFile(join(evidenceDir, 'metrics.json'), serialize(artifacts.metrics));
  await writeFile(join(evidenceDir, 'stamp.json'), serialize(artifacts.stamp));

  const indexPath = join(baseDir, 'index.json');
  const index = await loadIndex(indexPath);
  const entryPath = `${evidenceId}/report.json`;
  const hasEntry = index.items.some((item) => item.id === evidenceId);

  if (!hasEntry) {
    index.items.push({ id: evidenceId, path: entryPath });
    index.items.sort((left, right) => left.id.localeCompare(right.id));
    await writeFile(indexPath, serialize(index));
  }
};

export type { EvidenceArtifacts, EvidenceIndex, EvidenceIndexItem };
