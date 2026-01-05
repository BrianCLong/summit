import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { parseArgs } from 'util';

const options = {
  dir: { type: 'string', default: 'dist/release' },
  strict: { type: 'boolean', default: false },
};

const { values } = parseArgs({ options, strict: false });

const SCHEMAS_DIR = 'schemas/release';

const ajv = new Ajv({ strict: false });
addFormats(ajv);

// Map of schema filename to expected artifact filename(s)
const schemaMap = {
  'release-status.schema.json': 'release-status.json',
  'bundle-index.schema.json': 'bundle-index.json',
  'provenance.schema.json': 'provenance.json',
  'release-manifest.schema.json': 'release-manifest.json',
};

async function main() {
  console.log(`🔍 validating release bundle in ${values.dir}`);
  console.log(`   mode: ${values.strict ? 'STRICT' : 'LAX'}`);

  if (!existsSync(SCHEMAS_DIR)) {
    console.error(`❌ Schemas directory not found: ${SCHEMAS_DIR}`);
    process.exit(1);
  }

  const schemaFiles = readdirSync(SCHEMAS_DIR).filter(f => f.endsWith('.schema.json'));
  let failureCount = 0;
  let successCount = 0;
  let missingCount = 0;

  for (const schemaFile of schemaFiles) {
    const artifactName = schemaMap[schemaFile];
    if (!artifactName) {
      // If we add more schemas later without updating the map, we skip them or assume a convention
      continue;
    }

    const artifactPath = join(values.dir, artifactName);
    const schemaPath = join(SCHEMAS_DIR, schemaFile);

    if (!existsSync(artifactPath)) {
      if (values.strict) {
        console.error(`❌ Missing required artifact: ${artifactName}`);
        failureCount++;
      } else {
        console.warn(`⚠️  Missing artifact: ${artifactName} (skipping validation)`);
        missingCount++;
      }
      continue;
    }

    try {
      const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
      const data = JSON.parse(readFileSync(artifactPath, 'utf8'));

      const validate = ajv.compile(schema);
      const valid = validate(data);

      if (!valid) {
        console.error(`❌ Validation failed for ${artifactName}:`);
        console.error(`   ${validate.errors[0].instancePath} ${validate.errors[0].message}`);
        failureCount++;
      } else {
        // console.log(`✅ ${artifactName} passed`);
        successCount++;
      }

    } catch (e) {
      console.error(`❌ Error processing ${artifactName}: ${e.message}`);
      failureCount++;
    }
  }

  console.log('\n-----------------------------------');
  if (failureCount > 0) {
    console.log(`Schema validation: FAIL`);
    process.exit(1);
  } else {
    console.log(`Schema validation: PASS (${successCount} files checked, ${missingCount} missing)`);
    process.exit(0);
  }
}

main();
