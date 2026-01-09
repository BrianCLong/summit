import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    record: { type: 'string' },
    schema: { type: 'string', default: 'schemas/hotfix-record.schema.json' },
  },
  strict: false,
});

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!values.record) {
  fail('Missing --record');
}

if (!existsSync(values.record)) {
  fail(`Record file not found: ${values.record}`);
}

if (!existsSync(values.schema)) {
  fail(`Schema file not found: ${values.schema}`);
}

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const schema = JSON.parse(readFileSync(values.schema, 'utf-8'));
const record = JSON.parse(readFileSync(values.record, 'utf-8'));

const validate = ajv.compile(schema);
const valid = validate(record);

if (!valid) {
  const error = validate.errors?.[0];
  fail(`Schema validation failed: ${error?.instancePath} ${error?.message}`);
}

console.log('✅ Hotfix record schema validation passed');
