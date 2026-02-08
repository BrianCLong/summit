import fs from 'node:fs';
import path from 'node:path';

const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:/;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const root = process.cwd();
const indexPath = path.join(root, 'evidence', 'index.json');

if (!fs.existsSync(indexPath)) {
  fail(`missing ${indexPath}`);
}

const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
  fail('evidence/index.json has no items[]');
}

const seen = new Set();

for (const item of parsed.items) {
  if (!item.evidence_id) {
    fail('evidence/index.json entry missing evidence_id');
  }
  if (seen.has(item.evidence_id)) {
    fail(`duplicate evidence_id: ${item.evidence_id}`);
  }
  seen.add(item.evidence_id);

  const { report, metrics, stamp } = item.files || {};
  if (!report || !metrics || !stamp) {
    fail(`evidence entry ${item.evidence_id} missing file paths`);
  }

  const reportPath = path.join(root, report);
  const metricsPath = path.join(root, metrics);
  const stampPath = path.join(root, stamp);

  if (!fs.existsSync(reportPath)) {
    fail(`missing evidence file: ${reportPath}`);
  }
  if (!fs.existsSync(metricsPath)) {
    fail(`missing evidence file: ${metricsPath}`);
  }
  if (!fs.existsSync(stampPath)) {
    fail(`missing evidence file: ${stampPath}`);
  }

  const reportContents = fs.readFileSync(reportPath, 'utf8');
  const metricsContents = fs.readFileSync(metricsPath, 'utf8');
  const stampContents = fs.readFileSync(stampPath, 'utf8');

  if (timestampPattern.test(reportContents)) {
    fail(`timestamps detected in report.json for ${item.evidence_id}`);
  }
  if (timestampPattern.test(metricsContents)) {
    fail(`timestamps detected in metrics.json for ${item.evidence_id}`);
  }
  void stampContents;
}

console.log('evidence verify OK');
