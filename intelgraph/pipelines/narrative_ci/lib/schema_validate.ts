import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const [outDir, schemaDir] = process.argv.slice(2);

if (!outDir || !schemaDir) {
  console.error('Usage: schema_validate.ts <outDir> <schemaDir>');
  process.exit(1);
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

async function loadSchemas(directory: string) {
  const files = await readdir(directory);
  const schemas = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => {
        const schemaPath = path.join(directory, file);
        const contents = await readFile(schemaPath, 'utf-8');
        return { name: path.basename(file, '.json'), schema: JSON.parse(contents) };
      }),
  );

  for (const entry of schemas) {
    if (entry.schema.$id) {
      ajv.addSchema(entry.schema);
    }
  }

  return schemas;
}

async function validateOutputs(
  directory: string,
  schemas: Array<{ name: string; schema: unknown }>,
) {
  const files = await readdir(directory, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    if (file.isDirectory()) {
      await validateOutputs(fullPath, schemas);
      continue;
    }
    if (!file.name.endsWith('.json')) {
      continue;
    }
    const payload = JSON.parse(await readFile(fullPath, 'utf-8'));
    const matching = schemas.find((entry) => {
      const schemaObj = entry.schema as { ['x-targets']?: string[] };
      if (schemaObj && Array.isArray(schemaObj['x-targets'])) {
        return schemaObj['x-targets'].some((target) => fullPath.endsWith(target));
      }
      return fullPath.includes(entry.name);
    });
    if (!matching) {
      continue;
    }
    const validate = ajv.compile(matching.schema);
    const valid = validate(payload);
    if (!valid) {
      console.error(`Schema validation failed for ${fullPath}`);
      console.error(validate.errors);
      process.exit(1);
    }
  }
}

const schemas = await loadSchemas(schemaDir);
await validateOutputs(outDir, schemas);
console.log('Schema validation succeeded');
