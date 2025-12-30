import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { createRequire } from 'node:module';
import {
  entitySchema,
  edgeSchema,
  connectorSchema,
  runSchema,
  secretSchema,
  envelopeSchema,
} from '../dist/types.js';

const require = createRequire(import.meta.url);
// Direct import of package.json via require can fail if exports are restrictive
// We can just rely on the installed version being what we expect (pinned in package.json)
// or try to read it from the file system if we really want to print it.
// For now, let's skip printing the version to avoid the export restriction error,
// or we could use fs to read it relative to node_modules if we were in a non-module context,
// but relying on the pinned version in package.json is the source of truth for this exercise.

const schemas = {
  entity: entitySchema,
  edge: edgeSchema,
  connector: connectorSchema,
  run: runSchema,
  secret: secretSchema,
  envelope: envelopeSchema,
};

const schemasDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas');
mkdirSync(schemasDir, { recursive: true });

let hasError = false;

console.log('Verifying schemas...');

for (const [name, schema] of Object.entries(schemas)) {
  const jsonSchema = zodToJsonSchema(schema, { name });
  const generatedContent = JSON.stringify(jsonSchema, null, 2);
  const filePath = join(schemasDir, `${name}.json`);

  try {
    const existingContent = readFileSync(filePath, 'utf-8');
    // Normalize newlines and trim
    if (generatedContent.trim() !== existingContent.trim()) {
        console.error(`ERROR: Schema drift detected for ${name}.json`);
        console.error(`Expected content to match generated schema.`);
        // console.error(`Generated:\n${generatedContent}`);
        // console.error(`Existing:\n${existingContent}`);
        hasError = true;
    } else {
        console.log(`OK: ${name}.json`);
    }
  } catch (error) {
    console.error(`ERROR: Could not read ${filePath} or it does not exist.`);
    console.error(error.message);
    hasError = true;
  }
}

if (hasError) {
  console.error('\nSchema drift detected! Please run "npm run generate:schema" in packages/common-types to update the schemas.');
  process.exit(1);
} else {
    console.log('\nAll schemas are up to date.');
}
