import fs from 'fs';
const base = JSON.parse(fs.readFileSync('perf-baseline.json', 'utf8'));
const cur = JSON.parse(fs.readFileSync('perf.json', 'utf8'));
if (cur.p95 > base.p95 * 1.05) {
  console.error('p95 regression');
  process.exit(1);
}
