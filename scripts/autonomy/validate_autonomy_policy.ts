import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';

const POLICY_PATH = path.join(process.cwd(), 'docs/autonomy/autonomy_policy.yml');
const SCHEMA_PATH = path.join(process.cwd(), 'schemas/autonomy/autonomy_policy.schema.json');

async function validatePolicy() {
  try {
    if (!fs.existsSync(POLICY_PATH)) {
      throw new Error(`Policy file not found at ${POLICY_PATH}`);
    }
    if (!fs.existsSync(SCHEMA_PATH)) {
      throw new Error(`Schema file not found at ${SCHEMA_PATH}`);
    }

    const policyContent = fs.readFileSync(POLICY_PATH, 'utf8');
    const policy = yaml.load(policyContent);

    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const schema = JSON.parse(schemaContent);

    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(policy);

    if (!valid) {
      console.error('Policy validation failed:');
      console.error(validate.errors);
      process.exit(1);
    }

    console.log('Autonomy policy is valid.');
  } catch (error) {
    console.error('Error validating autonomy policy:', error);
    process.exit(1);
  }
}

validatePolicy();
