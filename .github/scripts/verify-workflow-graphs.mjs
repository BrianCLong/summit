import fs from 'node:fs';

const mustExist = [
  'evidence/index.json',
  'evidence/workflow-graphs/report.json',
  'evidence/workflow-graphs/metrics.json',
  'evidence/workflow-graphs/stamp.json',
];

for (const path of mustExist) {
  if (!fs.existsSync(path)) {
    console.error(`missing: ${path}`);
    process.exit(1);
  }
}

const stamp = JSON.parse(
  fs.readFileSync('evidence/workflow-graphs/stamp.json', 'utf8'),
);
const report = JSON.parse(
  fs.readFileSync('evidence/workflow-graphs/report.json', 'utf8'),
);
if (typeof report.evidence_id !== 'string') {
  console.error('report.json must include evidence_id');
  process.exit(1);
}

const forbiddenKeys = ['timestamp', 'generated_at', 'created_at'];
const scanJson = (obj, path) => {
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (forbiddenKeys.includes(key) && !path.startsWith('stamp')) {
        console.error(`forbidden key '${key}' found outside stamp.json`);
        process.exit(1);
      }
      scanJson(value, `${path}.${key}`);
    }
  }
};
scanJson(report, 'report');
scanJson(
  JSON.parse(fs.readFileSync('evidence/workflow-graphs/metrics.json', 'utf8')),
  'metrics',
);

if (!('generated_at' in stamp) || !('git_sha' in stamp)) {
  console.error('stamp.json must include generated_at and git_sha');
  process.exit(1);
}

console.log('verify-workflow-graphs: ok');
