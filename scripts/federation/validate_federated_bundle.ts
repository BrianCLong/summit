import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the schema
const schemaPath = resolve(__dirname, '../../schemas/federation/federated_bundle.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

// Create a new Ajv instance
const ajv = new Ajv();
addFormats(ajv);

// Compile the schema
const validate = ajv.compile(schema);

/**
 * Validates a federated evidence bundle against the schema.
 * @param bundle The bundle to validate.
 * @returns A promise that resolves if the bundle is valid, and rejects with an error otherwise.
 */
export async function validateFederatedBundle(bundle: any): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const isValid = validate(bundle);
    if (isValid) {
      resolvePromise();
    } else {
      rejectPromise(new Error(`Invalid federated bundle: ${ajv.errorsText(validate.errors)}`));
    }
  });
}

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      const bundlePath = process.argv[2];
      if (!bundlePath) {
        console.error('Usage: ts-node validate_federated_bundle.ts <path-to-bundle.json>');
        process.exit(1);
      }
      const bundle = JSON.parse(readFileSync(bundlePath, 'utf-8'));
      await validateFederatedBundle(bundle);
      console.log('Federated bundle is valid.');
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
