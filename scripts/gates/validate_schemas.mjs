import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../');
const SCHEMAS_DIR = path.join(REPO_ROOT, 'schemas');
const FIXTURES_VALID_DIR = path.join(REPO_ROOT, 'fixtures/schemas/valid');
const FIXTURES_INVALID_DIR = path.join(REPO_ROOT, 'fixtures/schemas/invalid');

const ajv = new Ajv({ strict: false });

function loadSchemas() {
  const schemas = [
    'investigation_run.schema.json',
    'evidence_object.schema.json',
    'evidence_bundle.schema.json'
  ];

  const validators = {};

  for (const schemaFile of schemas) {
    const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
    if (!fs.existsSync(schemaPath)) {
      console.error(`Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    validators[schemaFile.replace('.schema.json', '')] = ajv.compile(schemaContent);
  }

  return validators;
}

function runTests() {
  const validators = loadSchemas();
  let failed = false;

  // Test Valid Fixtures
  console.log('--- Testing Valid Fixtures ---');
  for (const [name, validate] of Object.entries(validators)) {
    const fixturePath = path.join(FIXTURES_VALID_DIR, `${name}.json`);
    if (fs.existsSync(fixturePath)) {
      const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const isValid = validate(data);
      if (isValid) {
        console.log(`✅ ${name} valid fixture passed.`);
      } else {
        console.error(`❌ ${name} valid fixture FAILED:`);
        console.error(validate.errors);
        failed = true;
      }
    } else {
      console.warn(`⚠️ Warning: No valid fixture found for ${name} at ${fixturePath}`);
    }
  }

  // Test Invalid Fixtures
  console.log('\n--- Testing Invalid Fixtures ---');
  for (const [name, validate] of Object.entries(validators)) {
    const fixturePath = path.join(FIXTURES_INVALID_DIR, `${name}.json`);
    if (fs.existsSync(fixturePath)) {
      const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const isValid = validate(data);
      if (!isValid) {
        console.log(`✅ ${name} invalid fixture correctly rejected.`);
      } else {
        console.error(`❌ ${name} invalid fixture FAILED (should have been rejected but was accepted).`);
        failed = true;
      }
    } else {
      console.warn(`⚠️ Warning: No invalid fixture found for ${name} at ${fixturePath}`);
    }
  }

  if (failed) {
    console.error('\n❌ Schema validation tests failed.');
    process.exit(1);
  } else {
    console.log('\n✅ All schema validation tests passed.');
    process.exit(0);
  }
}

runTests();