import fs from 'fs';
import path from 'path';
const items = [
  { src: 'docs/ops/tta/summary.json', dest: 'artifacts/metrics/tta.json' },
  { src: 'docs/ops/audit/weekly.json', dest: 'artifacts/audit/weekly.json' },
  { src: 'docs/ops/warehouse/kpis.csv', dest: 'artifacts/metrics/kpis.csv' },
  {
    src: '.github/workflows/docs-policy.yml',
    dest: 'artifacts/controls/policy-workflow.yml',
  },
];
for (const it of items) {
  if (fs.existsSync(it.src)) {
    const out = path.join('artifacts', it.dest.split('/').slice(1).join('/'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(it.src, out);
  }
}
console.log('Evidence collected');
