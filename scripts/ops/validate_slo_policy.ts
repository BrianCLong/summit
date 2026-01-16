import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';

const POLICY_PATH = path.join(process.cwd(), 'docs/ops/slo_policy.yml');
const SCHEMA_PATH = path.join(process.cwd(), 'schemas/ops/slo_policy.schema.json');

const main = () => {
  if (!fs.existsSync(POLICY_PATH)) {
    console.error(`❌ Policy file not found at ${POLICY_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌ Schema file not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const policy = yaml.load(fs.readFileSync(POLICY_PATH, 'utf8'));
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(policy);

  if (!valid) {
    console.error('❌ SLO Policy validation failed:');
    console.error(validate.errors);
    process.exit(1);
  }

  console.log('✅ SLO Policy is valid and strictly typed.');

  // Determinism check (example: verify items are sorted or unique if needed,
  // currently just schema validation is sufficient for structure)
};

main();
