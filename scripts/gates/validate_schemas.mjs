import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const globalNodeModules = execSync('npm root -g').toString().trim();

let Ajv2020;
let addFormats;

try {
  Ajv2020 = require('ajv/dist/2020.js');
  addFormats = require('ajv-formats');
} catch (e) {
  try {
    Ajv2020 = require(path.join(globalNodeModules, 'ajv/dist/2020.js'));
    addFormats = require(path.join(globalNodeModules, 'ajv-formats'));
  } catch (err) {
    console.error('Failed to load ajv. Please make sure it is installed globally.');
    process.exitCode = 1;
    process.exit(1);
  }
}

const ajvOptions = {
  strict: false,
  allErrors: true,
};

const ajv = new Ajv2020(ajvOptions);

if (addFormats) {
  addFormats(ajv);
}

// Add draft-06, draft-07 and other meta-schemas
let draft06, draft07;
try {
  draft06 = require('ajv/lib/refs/json-schema-draft-06.json');
  draft07 = require('ajv/lib/refs/json-schema-draft-07.json');
  ajv.addMetaSchema(draft06);
  ajv.addMetaSchema(draft07);
} catch (e) {
  try {
    draft06 = require(path.join(globalNodeModules, 'ajv/lib/refs/json-schema-draft-06.json'));
    draft07 = require(path.join(globalNodeModules, 'ajv/lib/refs/json-schema-draft-07.json'));
    ajv.addMetaSchema(draft06);
    ajv.addMetaSchema(draft07);
  } catch (e) {}
}

const schemasDir = 'schemas';
const validFixturesDir = 'fixtures/schemas/valid';
const invalidFixturesDir = 'fixtures/schemas/invalid';

let hasErrors = false;

function loadJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

if (fs.existsSync(schemasDir)) {
  const schemas = fs.readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'));

  // First pass: add all schemas to the ajv instance so cross-references work
  for (const schemaFile of schemas) {
    const schemaPath = path.join(schemasDir, schemaFile);
    try {
      const schema = loadJson(schemaPath);
      // Remove $id to avoid conflict if already exists or we want to use fresh compilation
      delete schema.$id;
      delete schema.id;
      ajv.addSchema(schema, schemaFile);
    } catch (e) {
    }
  }

  // Second pass: compile and validate
  for (const schemaFile of schemas) {
    const schemaPath = path.join(schemasDir, schemaFile);
    let schema = loadJson(schemaPath);
    delete schema.$id;
    delete schema.id;

    let validate;
    try {
      validate = ajv.compile(schema);
    } catch (e) {
      console.error(`Failed to compile schema ${schemaPath}:`, e.message);
      hasErrors = true;
      continue;
    }

    const schemaName = path.basename(schemaPath, '.schema.json');
    console.log(`Validating schema: ${schemaName}`);

    // Validate valid fixtures
    if (fs.existsSync(validFixturesDir)) {
      const validFiles = fs.readdirSync(validFixturesDir).filter(f => f.startsWith(schemaName));
      for (const file of validFiles) {
        const data = loadJson(path.join(validFixturesDir, file));
        console.log(`  Checking valid fixture: ${file}`);
        if (!validate(data)) {
          console.error(`  ❌ Valid fixture ${file} failed validation against ${schemaName}:`, validate.errors);
          hasErrors = true;
        } else {
          console.log(`  ✅ Valid fixture passed.`);
        }
      }
    }

    // Validate invalid fixtures
    if (fs.existsSync(invalidFixturesDir)) {
      const invalidFiles = fs.readdirSync(invalidFixturesDir).filter(f => f.startsWith(schemaName));
      for (const file of invalidFiles) {
        const data = loadJson(path.join(invalidFixturesDir, file));
        console.log(`  Checking invalid fixture: ${file}`);
        if (validate(data)) {
          console.error(`  ❌ ERROR: Invalid fixture ${file} unexpectedly passed validation against ${schemaName}.`);
          hasErrors = true;
        } else {
          console.log(`  ✅ Invalid fixture correctly failed.`);
        }
      }
    }
  }
} else {
  console.log("No schemas directory found.");
}

if (hasErrors) {
  console.error("Validation failed.");
  process.exitCode = 1;
} else {
  console.log('All schemas validated successfully.');
}
