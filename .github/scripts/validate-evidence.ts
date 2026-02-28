import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schemaDir = path.resolve('src/graphrag/evidence/schemas');
const schemas = {
  report: JSON.parse(fs.readFileSync(path.join(schemaDir, 'report.schema.json'), 'utf8')),
  metrics: JSON.parse(fs.readFileSync(path.join(schemaDir, 'metrics.schema.json'), 'utf8')),
  stamp: JSON.parse(fs.readFileSync(path.join(schemaDir, 'stamp.schema.json'), 'utf8')),
  index: JSON.parse(fs.readFileSync(path.join(schemaDir, 'index.schema.json'), 'utf8')),
};

function validateFile(filepath: string, schema: any): boolean {
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    console.error(`❌ Validation failed for ${filepath}:`);
    console.error(validate.errors);
    return false;
  }
  return true;
}

// Simple logic to find evidence bundles and validate them
const evidenceRoot = 'evidence';
if (fs.existsSync(evidenceRoot)) {
  // Logic to walk through 'evidence' dir and validate
  // For the initial PR, we might only have fixtures in tests/
}

// Support CLI usage for specific files
const [,, fileType, filePath] = process.argv;
if (fileType && filePath) {
  const schema = (schemas as any)[fileType];
  if (schema) {
    if (validateFile(filePath, schema)) {
      console.log(`✅ ${filePath} is valid.`);
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}
