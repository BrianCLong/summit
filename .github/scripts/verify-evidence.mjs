import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'evidence');
const REQUIRED_FILES = ['report.json', 'metrics.json', 'stamp.json', 'index.json'];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(EVIDENCE_DIR)) {
  fail('Missing evidence/ directory');
}

for (const entry of fs.readdirSync(EVIDENCE_DIR)) {
  const bundlePath = path.join(EVIDENCE_DIR, entry);
  if (!fs.statSync(bundlePath).isDirectory()) {
    continue;
  }

  for (const filename of REQUIRED_FILES) {
    const filePath = path.join(bundlePath, filename);
    if (!fs.existsSync(filePath)) {
      fail(`Missing ${filePath}`);
    }
  }
}

console.log('evidence verification: OK');
