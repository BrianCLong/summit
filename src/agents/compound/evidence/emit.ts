import fs from 'node:fs';
import path from 'node:path';

export type EvidenceIndex = Record<string, { path: string; kind: string }>;

export function writeJsonAtomic(filePath: string, payload: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export function emitEvidenceBundle(
  outDir: string,
  bundle: {
    report: unknown;
    metrics: unknown;
    stamp: unknown;
    index: EvidenceIndex;
  },
): void {
  writeJsonAtomic(path.join(outDir, 'report.json'), bundle.report);
  writeJsonAtomic(path.join(outDir, 'metrics.json'), bundle.metrics);
  writeJsonAtomic(path.join(outDir, 'stamp.json'), bundle.stamp);
  writeJsonAtomic(path.join(outDir, 'index.json'), bundle.index);
}
