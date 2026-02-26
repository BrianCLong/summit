import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';

const ajv = new (Ajv as any)({ allErrors: true });
addFormats(ajv);

const schemas = {
  report: JSON.parse(readFileSync('packages/intelgraph/graphrag/src/evidence/schemas/report.schema.json', 'utf-8')),
  metrics: JSON.parse(readFileSync('packages/intelgraph/graphrag/src/evidence/schemas/metrics.schema.json', 'utf-8')),
  stamp: JSON.parse(readFileSync('packages/intelgraph/graphrag/src/evidence/schemas/stamp.schema.json', 'utf-8')),
};

Object.entries(schemas).forEach(([key, schema]) => {
  ajv.addSchema(schema, key);
});

function validateFile(filepath: string, schemaKey: string) {
  if (!existsSync(filepath)) {
    console.error(`::error::File not found: ${filepath}`);
    return false;
  }
  const data = JSON.parse(readFileSync(filepath, 'utf-8'));
  const validate = ajv.getSchema(schemaKey);
  if (!validate) {
    console.error(`::error::Schema not found for key: ${schemaKey}`);
    return false;
  }
  if (!validate(data)) {
    console.error(`::error::Validation failed for ${filepath}:`, ajv.errorsText(validate.errors));
    return false;
  }
  return true;
}

function main() {
  const indexPath = 'evidence/index.json';
  if (!existsSync(indexPath)) {
    console.log('No evidence index found, skipping validation.');
    return;
  }

  const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
  let allValid = true;

  for (const key in index.evidence) {
    const entry = index.evidence[key];
    if (entry.evidence_id.startsWith('EVD-INFOWAR')) {
       for (const fileKey in entry.files) {
         const file = entry.files[fileKey];
         let schemaKey = '';
         if (file.includes('report.schema.json')) schemaKey = 'report';
         else if (file.includes('metrics.schema.json')) schemaKey = 'metrics';
         else if (file.includes('stamp.schema.json')) schemaKey = 'stamp';

         if (schemaKey) {
           if (!validateFile(file, schemaKey)) {
             allValid = false;
           }
         }
       }
    }
  }

  if (!allValid) {
    process.exit(1);
  }

  console.log('✅ Evidence validation passed');
}

main();
