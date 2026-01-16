import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const SCHEMA_PATH = path.resolve('schemas/security/security_gates.schema.json');
const POLICY_PATH = path.resolve('docs/security/security_gates.yml');

function validateSecurityGates() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(POLICY_PATH)) {
    console.error(`Policy not found at ${POLICY_PATH}`);
    process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  const policy = yaml.load(fs.readFileSync(POLICY_PATH, 'utf-8'));

  const ajv = new Ajv();
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(policy);

  if (!valid) {
    console.error('Security Gates Policy is invalid:');
    console.error(validate.errors);
    process.exit(1);
  }

  // Cross-reference check: Ensure all required_checks exist in gates definitions
  const gates = policy.gates;
  const stages = policy.required_checks;

  for (const [stage, checks] of Object.entries(stages)) {
    if (Array.isArray(checks)) {
      for (const checkId of checks) {
        if (!gates[checkId]) {
          console.error(`Error: Check '${checkId}' required for '${stage}' is not defined in 'gates'.`);
          process.exit(1);
        }
      }
    }
  }

  console.log('Security Gates Policy is valid.');
}

validateSecurityGates();
