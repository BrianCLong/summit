import fs from 'node:fs';
import path from 'node:path';

type EvidenceIndex = {
  version: number;
  items: Array<{
    evidence_id: string;
    files: { report: string; metrics: string; stamp: string };
  }>;
};

const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:/;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function verifyNoTimestamps(filePath: string, label: string): void {
  const contents = fs.readFileSync(filePath, 'utf8');
  if (timestampRegex.test(contents)) {
    fail(`timestamps detected in ${label}: ${filePath}`);
  }
}

const root = process.cwd();
const indexPath = path.join(root, 'evidence', 'index.json');

if (!fs.existsSync(indexPath)) {
  fail(`missing ${indexPath}`);
}

const index = JSON.parse(
  fs.readFileSync(indexPath, 'utf8'),
) as EvidenceIndex;

if (!Array.isArray(index.items) || index.items.length === 0) {
  fail('evidence/index.json has no items[]');
}

for (const item of index.items) {
  const reportPath = path.join(root, item.files.report);
  const metricsPath = path.join(root, item.files.metrics);
  const stampPath = path.join(root, item.files.stamp);

  if (!fs.existsSync(reportPath)) {
    fail(`missing evidence file: ${reportPath}`);
  }
  if (!fs.existsSync(metricsPath)) {
    fail(`missing evidence file: ${metricsPath}`);
  }
  if (!fs.existsSync(stampPath)) {
    fail(`missing evidence file: ${stampPath}`);
  }

  verifyNoTimestamps(reportPath, 'report.json');
  verifyNoTimestamps(metricsPath, 'metrics.json');
}

console.log('evidence verify OK');
