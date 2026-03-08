import fs from 'fs';
import path from 'path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const schemasDir = path.join(rootDir, 'docs/api/schemas/evidence');
const ajv = new Ajv({ strict: false });
addFormats(ajv);

if (!fs.existsSync(schemasDir)) {
  console.error(`Schemas directory not found: ${schemasDir}`);
  process.exit(1);
}

const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'));
const schemas: Record<string, any> = {};

console.log(`Found ${schemaFiles.length} schemas in ${schemasDir}`);

let hasError = false;

// 1. Compile Schemas
for (const file of schemaFiles) {
  const schemaPath = path.join(schemasDir, file);
  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);
    ajv.addSchema(schema); // adds by $id
    schemas[file] = schema;
    console.log(`✅ ${file} compiled successfully`);
  } catch (e) {
    console.error(`❌ ${file} failed compilation: `, e);
    hasError = true;
  }
}

// 2. Validate Fixtures
const fixturesDir = path.join(rootDir, 'server/tests/fixtures/evidence');

function validateFixture(filePath: string, expectedValid: boolean) {
  const fileName = path.basename(filePath);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    let schemaName = '';
    if (fileName.includes('report')) schemaName = 'report.schema.json';
    else if (fileName.includes('metrics')) schemaName = 'metrics.schema.json';
    else if (fileName.includes('stamp')) schemaName = 'stamp.schema.json';
    else if (fileName.includes('index')) schemaName = 'index.schema.json';

    if (!schemaName || !schemas[schemaName]) {
      console.warn(`⚠️ Skipping fixture ${fileName} (no matching schema found)`);
      return;
    }

    const schemaId = schemas[schemaName].$id;
    const validate = ajv.getSchema(schemaId);

    if (!validate) {
      console.error(`❌ Could not retrieve compiled schema for ${schemaName}`);
      hasError = true;
      return;
    }

    const valid = validate(data);

    if (expectedValid) {
      if (!valid) {
        console.error(`❌ Positive fixture ${fileName} failed validation:`, validate.errors);
        hasError = true;
      } else {
        console.log(`✅ Positive fixture ${fileName} passed`);
      }
    } else {
      if (valid) {
        console.error(`❌ Negative fixture ${fileName} unexpectedly passed validation`);
        hasError = true;
      } else {
        console.log(`✅ Negative fixture ${fileName} failed as expected`);
      }
    }

  } catch (e) {
    console.error(`❌ Error processing fixture ${fileName}: `, e);
    hasError = true;
  }
}

if (fs.existsSync(fixturesDir)) {
  const positiveDir = path.join(fixturesDir, 'positive');
  const negativeDir = path.join(fixturesDir, 'negative');

  if (fs.existsSync(positiveDir)) {
    fs.readdirSync(positiveDir).filter(f => f.endsWith('.json')).forEach(f => {
      validateFixture(path.join(positiveDir, f), true);
    });
  }

  if (fs.existsSync(negativeDir)) {
    fs.readdirSync(negativeDir).filter(f => f.endsWith('.json')).forEach(f => {
      validateFixture(path.join(negativeDir, f), false);
    });
  }
} else {
  console.log('No fixtures found, skipping validation.');
}

if (hasError) {
  process.exit(1);
}
