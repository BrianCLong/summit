import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import type { AdapterCompatibilityMatrix, AdapterManifest } from './types.js';
import { BundleValidationError } from './types.js';
import compatibilitySchema from './schemas/compatibility.schema.json';
import configSchema from './schemas/config.schema.json';
import manifestSchema from './schemas/manifest.schema.json';

const ajv = new Ajv({
  allErrors: true,
  strict: false,
});
addFormats(ajv);

// Add JSON Schema draft-2020-12 meta-schema
ajv.addMetaSchema({
  $id: 'https://json-schema.org/draft/2020-12/schema',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $vocabulary: {
    'https://json-schema.org/draft/2020-12/vocab/core': true,
    'https://json-schema.org/draft/2020-12/vocab/applicator': true,
    'https://json-schema.org/draft/2020-12/vocab/unevaluated': true,
    'https://json-schema.org/draft/2020-12/vocab/validation': true,
    'https://json-schema.org/draft/2020-12/vocab/meta-data': true,
    'https://json-schema.org/draft/2020-12/vocab/format-annotation': true,
    'https://json-schema.org/draft/2020-12/vocab/content': true,
  },
  $dynamicAnchor: 'meta',
  type: ['object', 'boolean'],
});

ajv.addSchema(compatibilitySchema);
ajv.addSchema(configSchema);
ajv.addSchema(manifestSchema);

const manifestValidator = ajv.getSchema<AdapterManifest>(manifestSchema.$id ?? 'manifest');
const compatibilityValidator = ajv.getSchema<AdapterCompatibilityMatrix>(
  compatibilitySchema.$id ?? 'compatibility'
);

export function validateManifest(manifest: unknown): asserts manifest is AdapterManifest {
  if (!manifestValidator) {
    throw new BundleValidationError('Manifest validator not found');
  }
  if (!manifestValidator(manifest)) {
    throw new BundleValidationError(formatValidationErrors('manifest', manifestValidator.errors));
  }
}

export function validateCompatibility(
  compatibility: unknown
): asserts compatibility is AdapterCompatibilityMatrix {
  if (!compatibilityValidator) {
    throw new BundleValidationError('Compatibility validator not found');
  }
  if (!compatibilityValidator(compatibility)) {
    throw new BundleValidationError(
      formatValidationErrors('compatibility matrix', compatibilityValidator.errors)
    );
  }
}

export function validateConfigSchema(schema: unknown): void {
   
  const valid = ajv.validateSchema(schema as any);
  if (!valid) {
    throw new BundleValidationError(formatValidationErrors('config schema', ajv.errors));
  }
}

export function formatValidationErrors(
  label: string,
  errors: ErrorObject[] | null | undefined
): string {
  if (!errors || errors.length === 0) {
    return `${label} validation failed with unknown error`;
  }

  const details = errors
    .map((err) => {
      const path = err.instancePath || err.schemaPath;
      const message = err.message ?? 'is invalid';
      return `${path}: ${message}`;
    })
    .join('; ');

  return `${label} validation failed: ${details}`;
}

export { manifestSchema, compatibilitySchema, configSchema, ajv };
