import fs from 'fs';
import path from 'path';
// import Ajv from 'ajv'; // CommonJS/ESM issue potential, handling dynamically or assuming ts-node handles it
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const run = async () => {
  const args = process.argv.slice(2);
  const manifestPath = args[0] || 'release/out/release-manifest.json';
  const schemaPath = args[1] || 'release/schema/release-manifest.schema.json';

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema not found at ${schemaPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

  const ajv = new Ajv();
  addFormats(ajv); // Enable format validation
  const validate = ajv.compile(schema);
  const valid = validate(manifest);

  if (!valid) {
    console.error('Manifest validation failed:');
    console.error(validate.errors);
    process.exit(1);
  }

  console.log('Manifest is valid against schema.');

  // Additional checks
  if (manifest.attestation.status === 'enabled') {
    if (!manifest.attestation.signatures || manifest.attestation.signatures.length === 0) {
      console.error('Attestation is enabled but no signatures found.');
      process.exit(1);
    }
    console.log('Signatures present (verification stubbed).');
  } else {
    console.log('Attestation disabled, verify issue link exists.');
    if (!manifest.attestation.issueLink) {
      console.error('Attestation disabled but no issue link provided.');
      process.exit(1);
    }
  }

  console.log('Verification successful.');
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
