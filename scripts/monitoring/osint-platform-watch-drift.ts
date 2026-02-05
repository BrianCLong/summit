import fs from 'fs/promises';
import path from 'path';

interface DriftMetrics {
  schema_version: 'platform-watch.drift-metrics.v1';
  window_days: number;
  totals: {
    reports: number;
    drift_reports: number;
  };
  by_platform: Record<string, { drift_reports: number }>;
}

function parseArgs(argv: string[]): { days: number; baseDir: string } {
  const args = new Map<string, string>();
  for (const arg of argv) {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) args.set(key.slice(2), value ?? '');
  }
  return {
    days: Number(args.get('days') ?? '7'),
    baseDir: args.get('base') ?? path.join(process.cwd(), 'artifacts', 'platform-watch'),
  };
}

async function listReportDirs(baseDir: string): Promise<string[]> {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function loadReport(baseDir: string, date: string): Promise<any> {
  const reportPath = path.join(baseDir, date, 'report.json');
  const raw = await fs.readFile(reportPath, 'utf8');
  return JSON.parse(raw);
}

async function run(): Promise<void> {
  const { days, baseDir } = parseArgs(process.argv.slice(2));
  const reportDirs = await listReportDirs(baseDir);
  const slice = reportDirs.slice(-days);

  const metrics: DriftMetrics = {
    schema_version: 'platform-watch.drift-metrics.v1',
    window_days: days,
    totals: { reports: 0, drift_reports: 0 },
    by_platform: {},
  };

  for (const date of slice) {
    const report = await loadReport(baseDir, date);
    metrics.totals.reports += 1;
    if (report?.drift?.detected) {
      metrics.totals.drift_reports += 1;
    }

    const claimMap = new Map<string, string>();
    for (const claim of report.claims ?? []) {
      claimMap.set(claim.id, claim.platform);
    }

    for (const reason of report.drift?.reasons ?? []) {
      const platform = claimMap.get(reason.claim_id) ?? 'unknown';
      const entry = metrics.by_platform[platform] ?? { drift_reports: 0 };
      entry.drift_reports += 1;
      metrics.by_platform[platform] = entry;
    }
  }

  const outputPath = path.join(baseDir, 'drift-metrics.json');
  await fs.writeFile(outputPath, JSON.stringify(metrics, null, 2) + '\n', 'utf8');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
