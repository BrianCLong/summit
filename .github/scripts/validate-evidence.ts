import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schemaDir = path.join(process.cwd(), 'src/graphrag/evidence/schemas');
const schemas = {
  report: JSON.parse(fs.readFileSync(path.join(schemaDir, 'report.schema.json'), 'utf8')),
  metrics: JSON.parse(fs.readFileSync(path.join(schemaDir, 'metrics.schema.json'), 'utf8')),
  stamp: JSON.parse(fs.readFileSync(path.join(schemaDir, 'stamp.schema.json'), 'utf8')),
  index: JSON.parse(fs.readFileSync(path.join(schemaDir, 'index.schema.json'), 'utf8')),
};

// Register schemas
ajv.addSchema(schemas.report, 'report');
ajv.addSchema(schemas.metrics, 'metrics');
ajv.addSchema(schemas.stamp, 'stamp');
ajv.addSchema(schemas.index, 'index');

function validateFile(filepath: string, schemaName: string) {
  if (!fs.existsSync(filepath)) {
    console.warn(`Skipping missing file: ${filepath}`);
    return true;
  }
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const validate = ajv.getSchema(schemaName);
  if (!validate) {
    throw new Error(`Schema not found: ${schemaName}`);
  }
  const valid = validate(data);
  if (!valid) {
    console.error(`Validation failed for ${filepath}:`);
    console.error(ajv.errorsText(validate.errors));
    return false;
  }
  console.log(`✅ ${filepath} is valid against ${schemaName} schema.`);
  return true;
}

// Simple CLI: tsx validate-evidence.ts <filepath> <schema-name>
const [,, file, schema] = process.argv;
if (file && schema) {
  if (!validateFile(file, schema)) {
    process.exit(1);
  }
} else {
  console.log("Usage: tsx validate-evidence.ts <file> <schema>");
  process.exit(0);
}
