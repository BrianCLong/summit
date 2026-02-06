import { readFileSync } from 'fs';
import path from 'path';

const evidenceDir = path.resolve('evidence');
const requiredFiles = [
  'index.json',
  'report.json',
  'metrics.json',
  'stamp.json',
];
const requiredEvidenceIds = [
  'EVD-DEEPAGENTS-VFS-ARCH-001',
  'EVD-DEEPAGENTS-VFS-SEC-001',
  'EVD-DEEPAGENTS-VFS-EVAL-001',
  'EVD-DEEPAGENTS-VFS-CI-001',
];

function loadJson(fileName: string): any {
  const filePath = path.join(evidenceDir, fileName);
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

const errors: string[] = [];

for (const fileName of requiredFiles) {
  try {
    readFileSync(path.join(evidenceDir, fileName), 'utf8');
  } catch (error) {
    errors.push(`Missing evidence file: ${fileName}`);
  }
}

let stamp: any = {};
try {
  stamp = loadJson('stamp.json');
  if (!stamp.generated_at || typeof stamp.generated_at !== 'string') {
    errors.push('stamp.json missing generated_at ISO string');
  }
} catch (error) {
  errors.push('stamp.json failed to parse');
}

const nonStampFiles = ['index.json', 'report.json', 'metrics.json'];
for (const fileName of nonStampFiles) {
  try {
    const data = loadJson(fileName);
    if (Object.prototype.hasOwnProperty.call(data, 'generated_at')) {
      errors.push(`Timestamp leakage: ${fileName} contains generated_at`);
    }
  } catch (error) {
    errors.push(`${fileName} failed to parse`);
  }
}

try {
  const index = loadJson('index.json');
  const evidenceMap = index?.evidence ?? {};
  for (const evidenceId of requiredEvidenceIds) {
    if (!evidenceMap[evidenceId]) {
      errors.push(`index.json missing evidence ID: ${evidenceId}`);
    }
  }
} catch (error) {
  errors.push('index.json failed to parse');
}

if (errors.length > 0) {
  console.error('Evidence verification failed:');
  errors.forEach((err) => console.error(`- ${err}`));
  process.exit(1);
}

console.log('Evidence verification passed.');
process.exit(0);
