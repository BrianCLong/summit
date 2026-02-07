import fs from 'node:fs';
import path from 'node:path';

function mustExist(targetPath) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing required path: ${targetPath}`);
  }
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

const evidenceDir = process.argv[2] ?? 'evidence';
const indexPath = path.join(evidenceDir, 'index.json');
const schemaDir = path.join(evidenceDir, 'schemas');
const requiredSchemas = [
  'report.schema.json',
  'metrics.schema.json',
  'stamp.schema.json',
  'index.schema.json',
];

mustExist(evidenceDir);
mustExist(indexPath);
mustExist(schemaDir);
readJson(indexPath);

for (const schemaName of requiredSchemas) {
  mustExist(path.join(schemaDir, schemaName));
}

console.log('evidence-verify: OK (structure only)');
