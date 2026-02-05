import fs from 'fs/promises';
import path from 'path';
import { PlatformWatchKg, PlatformWatchMetrics, PlatformWatchReport, PlatformWatchStamp } from './types';
import { stableStringify } from './stableJson';
import { renderReportMarkdown } from './reportMarkdown';

export interface ArtifactBundle {
  report: PlatformWatchReport;
  metrics: PlatformWatchMetrics;
  stamp: PlatformWatchStamp;
  kg?: PlatformWatchKg;
}

export async function writeArtifacts(baseDir: string, date: string, bundle: ArtifactBundle): Promise<void> {
  const targetDir = path.join(baseDir, date);
  await fs.mkdir(targetDir, { recursive: true });

  await fs.writeFile(path.join(targetDir, 'report.json'), stableStringify(bundle.report), 'utf8');
  await fs.writeFile(path.join(targetDir, 'metrics.json'), stableStringify(bundle.metrics), 'utf8');
  await fs.writeFile(path.join(targetDir, 'stamp.json'), stableStringify(bundle.stamp), 'utf8');
  await fs.writeFile(path.join(targetDir, 'report.md'), renderReportMarkdown(bundle.report), 'utf8');

  if (bundle.kg) {
    await fs.writeFile(path.join(targetDir, 'kg.json'), stableStringify(bundle.kg), 'utf8');
  }
}
