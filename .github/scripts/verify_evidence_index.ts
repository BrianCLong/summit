import * as fs from 'node:fs';
import * as path from 'node:path';

type EvidenceEntry = {
  id: string;
  report: string;
  metrics: string;
  stamp: string;
  path: string;
};

type EvidenceIndex = {
  version: number;
  evidence: EvidenceEntry[];
};

function mustExist(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required evidence file: ${filePath}`);
  }
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function main() {
  const baseDir = path.join(process.cwd(), 'evidence', 'pidm');
  const indexPath = path.join(baseDir, 'index.json');

  mustExist(indexPath);

  const index = JSON.parse(readText(indexPath)) as EvidenceIndex;
  if (index.version !== 1) {
    throw new Error(`Unsupported evidence index version: ${index.version}`);
  }

  for (const entry of index.evidence) {
    mustExist(path.join(baseDir, entry.report));
    mustExist(path.join(baseDir, entry.metrics));
    mustExist(path.join(baseDir, entry.stamp));
  }

  const reports = index.evidence.map((entry) =>
    readText(path.join(baseDir, entry.report)),
  );
  const metrics = index.evidence.map((entry) =>
    readText(path.join(baseDir, entry.metrics)),
  );

  for (const text of [...reports, ...metrics]) {
    if (text.includes('generated_at')) {
      throw new Error(
        'report.json and metrics.json must not include timestamps (use stamp.json).',
      );
    }
  }
}

main();
