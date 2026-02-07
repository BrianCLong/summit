import { promises as fs } from 'node:fs';
import path from 'node:path';

export type EvidenceStamp = { createdAt: string; runId: string };
export type EvidenceReport = {
  evdId: string;
  summary: string;
  artifacts: string[];
};
export type EvidenceMetrics = {
  evdId: string;
  metrics: Record<string, number>;
};

type EvidenceIndexItem = {
  evidence_id: string;
  files: {
    report: string;
    metrics: string;
    stamp: string;
  };
};

type EvidenceIndex = {
  version: number;
  items: EvidenceIndexItem[];
};

type WriteEvidenceOptions = {
  runId?: string;
};

const DEFAULT_INDEX: EvidenceIndex = { version: 1, items: [] };

export async function writeEvidence(
  baseDir: string,
  evdId: string,
  report: EvidenceReport,
  metrics: EvidenceMetrics,
  options: WriteEvidenceOptions = {},
) {
  const evidenceDir = path.join(baseDir, evdId);
  await fs.mkdir(evidenceDir, { recursive: true });

  await Promise.all([
    writeJson(path.join(evidenceDir, 'report.json'), report),
    writeJson(path.join(evidenceDir, 'metrics.json'), metrics),
  ]);

  const stamp: EvidenceStamp = {
    createdAt: new Date().toISOString(),
    runId: options.runId ?? process.env.GITHUB_RUN_ID ?? 'local',
  };
  await writeJson(path.join(evidenceDir, 'stamp.json'), stamp);

  const indexPath = path.join(baseDir, 'index.json');
  const index = await readIndex(indexPath);
  const files = buildEvidenceFiles(baseDir, evdId);

  const existing = index.items.find((item) => item.evidence_id === evdId);
  if (existing) {
    existing.files = files;
  } else {
    index.items.push({ evidence_id: evdId, files });
  }

  await writeJson(indexPath, index);
}

function buildEvidenceFiles(baseDir: string, evdId: string) {
  const reportPath = path.join(baseDir, evdId, 'report.json');
  const metricsPath = path.join(baseDir, evdId, 'metrics.json');
  const stampPath = path.join(baseDir, evdId, 'stamp.json');

  return {
    report: normalizePath(reportPath),
    metrics: normalizePath(metricsPath),
    stamp: normalizePath(stampPath),
  };
}

async function readIndex(indexPath: string): Promise<EvidenceIndex> {
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as EvidenceIndex;
    if (!parsed || !Array.isArray(parsed.items)) {
      return { ...DEFAULT_INDEX };
    }
    return {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      items: parsed.items,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { ...DEFAULT_INDEX };
    }
    throw error;
  }
}

async function writeJson(filePath: string, payload: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function normalizePath(filePath: string) {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}
