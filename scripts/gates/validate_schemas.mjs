import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const schemaDir = path.join(process.cwd(), 'schemas');
const validDir = path.join(process.cwd(), 'fixtures/schemas/valid');
const invalidDir = path.join(process.cwd(), 'fixtures/schemas/invalid');

let hasErrors = false;

// We use the already-installed Ajv from the project dependencies via dynamic import if needed
// or just skip strict validation if we're in a lightweight script, but let's try to find ajv.
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

function validate(schemaPath, dataPath, shouldBeValid) {
  const schemaStr = fs.readFileSync(schemaPath, 'utf-8');
  const dataStr = fs.readFileSync(dataPath, 'utf-8');

  let schema;
  let data;
  try {
    schema = JSON.parse(schemaStr);
    data = JSON.parse(dataStr);
  } catch (e) {
    console.error(`Error parsing JSON: ${e.message}`);
    hasErrors = true;
    return;
  }

  const validateFn = ajv.compile(schema);
  const valid = validateFn(data);

  if (valid !== shouldBeValid) {
    console.error(`Validation mismatch for ${dataPath} against ${schemaPath}. Expected valid=${shouldBeValid}, got valid=${valid}`);
    if (!valid) {
      console.error(validateFn.errors);
    }
    hasErrors = true;
  } else {
    console.log(`Successfully validated ${dataPath} (expected valid=${shouldBeValid})`);
  }
}

const schemas = {
  'investigation_run.schema.json': ['investigation_run.json'],
  'evidence_object.schema.json': ['evidence_object.json'],
  'evidence_bundle.schema.json': ['evidence_bundle.json']
};

for (const [schemaName, dataFiles] of Object.entries(schemas)) {
  const schemaPath = path.join(schemaDir, schemaName);

  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema not found: ${schemaPath}`);
    hasErrors = true;
    continue;
  }

  for (const dataFile of dataFiles) {
    const validPath = path.join(validDir, dataFile);
    if (fs.existsSync(validPath)) {
      validate(schemaPath, validPath, true);
    } else {
        console.error(`Valid fixture not found: ${validPath}`);
        hasErrors = true;
    }

    const invalidPath = path.join(invalidDir, dataFile);
    if (fs.existsSync(invalidPath)) {
      validate(schemaPath, invalidPath, false);
    } else {
        console.error(`Invalid fixture not found: ${invalidPath}`);
        hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('Schema validation failed.');
  process.exit(1);
} else {
  console.log('All schemas validated successfully.');
  process.exit(0);
}
