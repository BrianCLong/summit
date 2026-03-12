import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

const ajv = new Ajv();
addFormats(ajv);

const schemasPath = 'src/graphrag/evidence/schemas';
const schemas = {
  'index.json': JSON.parse(fs.readFileSync(path.join(schemasPath, 'index.schema.json'), 'utf8')),
  'report.json': JSON.parse(fs.readFileSync(path.join(schemasPath, 'report.schema.json'), 'utf8')),
  'metrics.json': JSON.parse(fs.readFileSync(path.join(schemasPath, 'metrics.schema.json'), 'utf8')),
  'stamp.json': JSON.parse(fs.readFileSync(path.join(schemasPath, 'stamp.schema.json'), 'utf8')),
};

function validateFile(filePath: string) {
  const fileName = path.basename(filePath);

  // Basic mapping: report.json uses report.schema.json
  let schema = schemas[fileName as keyof typeof schemas];

  if (!schema) {
    if (fileName.endsWith('report.json')) schema = schemas['report.json'];
    else if (fileName.endsWith('metrics.json')) schema = schemas['metrics.json'];
    else if (fileName.endsWith('stamp.json')) schema = schemas['stamp.json'];
  }

  if (!schema) {
    console.warn(`No schema found for ${fileName}, skipping.`);
    return true;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    console.error(`Validation failed for ${fileName}:`, validate.errors);
    return false;
  }

  console.log(`✅ ${fileName} is valid.`);
  return true;
}

function main() {
  const targetDir = process.argv[2] || 'evidence';
  if (!fs.existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
  let allValid = true;

  for (const file of files) {
    const valid = validateFile(path.join(targetDir, file));
    if (!valid) allValid = false;
  }

  if (!allValid) {
    process.exit(1);
  }
}

main();
