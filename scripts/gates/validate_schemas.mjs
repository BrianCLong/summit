import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const schemasDir = path.resolve(__dirname, '../../schemas');
const validFixturesDir = path.resolve(__dirname, '../../fixtures/schemas/valid');
const invalidFixturesDir = path.resolve(__dirname, '../../fixtures/schemas/invalid');

// Load dependent schemas first
const evidenceObjectSchemaPath = path.join(schemasDir, 'evidence_object.schema.json');
const evidenceObjectSchema = JSON.parse(fs.readFileSync(evidenceObjectSchemaPath, 'utf8'));
ajv.addSchema(evidenceObjectSchema, 'evidence_object.schema.json');

const schemaPaths = [
  path.join(schemasDir, 'investigation_run.schema.json'),
  evidenceObjectSchemaPath,
  path.join(schemasDir, 'evidence_bundle.schema.json'),
];

let failed = false;

for (const schemaPath of schemaPaths) {
  const schemaName = path.basename(schemaPath);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);

  const fixtureName = schemaName.replace('.schema.json', '.json');

  // Test valid fixtures
  const validFixturePath = path.join(validFixturesDir, fixtureName);
  if (fs.existsSync(validFixturePath)) {
    const data = JSON.parse(fs.readFileSync(validFixturePath, 'utf8'));
    const valid = validate(data);
    if (!valid) {
      console.error(`❌ Validation failed for VALID fixture: ${fixtureName}`);
      console.error(validate.errors);
      failed = true;
    } else {
      console.log(`✅ Validation passed for VALID fixture: ${fixtureName}`);
    }
  }

  // Test invalid fixtures
  const invalidFixturePath = path.join(invalidFixturesDir, fixtureName);
  if (fs.existsSync(invalidFixturePath)) {
    const data = JSON.parse(fs.readFileSync(invalidFixturePath, 'utf8'));
    const valid = validate(data);
    if (valid) {
      console.error(`❌ Validation passed for INVALID fixture (expected fail): ${fixtureName}`);
      failed = true;
    } else {
      console.log(`✅ Validation failed as expected for INVALID fixture: ${fixtureName}`);
    }
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('✅ All schema validations passed.');
}
