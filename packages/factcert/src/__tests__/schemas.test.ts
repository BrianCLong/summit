import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const schemaDir = join(__dirname, '../../schema');
const fixturesDir = join(__dirname, '../../../../fixtures/factcert');

// Load schemas
const credentialSchema = JSON.parse(readFileSync(join(schemaDir, 'credential.schema.json'), 'utf-8'));
const stampSchema = JSON.parse(readFileSync(join(schemaDir, 'stamp.schema.json'), 'utf-8'));

// Manually add schemas with simple ID to facilitate referencing
ajv.addSchema(stampSchema, 'stamp.schema.json');

describe('schemas', () => {
  it('validates credential fixture', () => {
    const validate = ajv.compile(credentialSchema);
    const fixture = JSON.parse(readFileSync(join(fixturesDir, 'credential_example.json'), 'utf-8'));
    const valid = validate(fixture);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });
});
