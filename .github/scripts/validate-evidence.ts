import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'evidence/index.json',
  'evidence/schemas/council-report.schema.json',
  'evidence/schemas/council-metrics.schema.json',
  'evidence/schemas/council-stamp.schema.json',
  'evidence/schemas/council-index.schema.json',
];

const missing = requiredFiles.filter((filePath) =>
  !fs.existsSync(path.resolve(filePath)),
);

if (missing.length > 0) {
  console.error(`Missing evidence scaffolding: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Council evidence scaffolding present.');
