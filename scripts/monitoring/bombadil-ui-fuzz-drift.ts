import fs from 'node:fs/promises';
import path from 'node:path';
import { hashObject, stableStringify } from '../../tools/ui_fuzz/src/determinism.js';

type HistoryEntry = {
  runId: string;
  violationCount: number;
  traceHash: string;
};

type DriftReport = {
  schemaVersion: number;
  runId: string;
  current: HistoryEntry;
  baselineAverage: number | null;
  driftDetected: boolean;
  reasons: string[];
};

const getArg = (name: string, fallback?: string) => {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
};

const readJson = async <T>(filePath: string): Promise<T> => {
  const payload = await fs.readFile(filePath, 'utf8');
  return JSON.parse(payload) as T;
};

const writeJson = async (filePath: string, payload: unknown) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${stableStringify(payload)}\n`, 'utf8');
};

const run = async () => {
  const baseDir = getArg('base-dir', path.join('artifacts', 'ui_fuzz'));
  const outputDir = getArg('output-dir', path.join('artifacts', 'ui_fuzz_drift'));
  const historyPath = getArg('history', path.join(outputDir, 'history.json'));
  const runId = process.env.GITHUB_RUN_ID || 'local';

  const report = await readJson<{ summary: { count: number } }>(
    path.join(baseDir, 'report.json'),
  );
  const stamp = await readJson<{ traceHash: string }>(path.join(baseDir, 'stamp.json'));

  const current: HistoryEntry = {
    runId,
    violationCount: report.summary.count,
    traceHash: stamp.traceHash,
  };

  let history: HistoryEntry[] = [];
  try {
    history = await readJson<HistoryEntry[]>(historyPath);
  } catch {
    history = [];
  }

  const updatedHistory = [...history, current].slice(-7);
  const baselineEntries = updatedHistory.length > 1 ? updatedHistory.slice(0, -1) : [];
  const baselineAverage =
    baselineEntries.length > 0
      ? baselineEntries.reduce((sum, entry) => sum + entry.violationCount, 0) /
        baselineEntries.length
      : null;

  const reasons: string[] = [];
  if (baselineAverage !== null && current.violationCount > baselineAverage) {
    reasons.push('Violation count increased vs rolling baseline.');
  }

  const lastEntry = baselineEntries[baselineEntries.length - 1];
  if (lastEntry && lastEntry.traceHash !== current.traceHash) {
    reasons.push('Determinism regression: trace hash changed.');
  }

  const driftDetected = reasons.length > 0;

  const driftReport: DriftReport = {
    schemaVersion: 1,
    runId,
    current,
    baselineAverage,
    driftDetected,
    reasons,
  };

  const metrics = {
    schemaVersion: 1,
    runId,
    historyDepth: updatedHistory.length,
    violationCount: current.violationCount,
    driftDetected,
  };

  await writeJson(path.join(outputDir, 'report.json'), driftReport);
  await writeJson(path.join(outputDir, 'metrics.json'), metrics);
  await writeJson(path.join(outputDir, 'stamp.json'), {
    schemaVersion: 1,
    reportHash: hashObject(driftReport),
    metricsHash: hashObject(metrics),
  });
  await writeJson(historyPath, updatedHistory);

  if (driftDetected) {
    process.exitCode = 2;
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
