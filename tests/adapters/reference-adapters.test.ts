// @ts-nocheck
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReferenceBundles, verifySignature } from '../../adapters/reference/packaging';
import { referenceAdapters } from '../../adapters/reference';

function describeType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function validateConfig(definition: any): string[] {
  const schema = definition.configSchema ?? {};
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];
  const config = definition.fixtures?.config ?? {};
  const errors: string[] = [];

  for (const key of required) {
    if (!(key in config)) {
      errors.push(`missing required "${key}"`);
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(config)) {
      if (!properties[key]) {
        errors.push(`unexpected property "${key}"`);
      }
    }
  }

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (!(key in config)) continue;
    const actual = config[key];
    if (propertySchema.type === 'array') {
      if (!Array.isArray(actual)) {
        errors.push(`property "${key}" expected array, found ${describeType(actual)}`);
      } else if (propertySchema.items?.type) {
        for (const item of actual) {
          if (describeType(item) !== propertySchema.items.type) {
            errors.push(`property "${key}" item expected ${propertySchema.items.type}, found ${describeType(item)}`);
            break;
          }
        }
      }
    } else if (propertySchema.type && describeType(actual) !== propertySchema.type) {
      errors.push(`property "${key}" expected ${propertySchema.type}, found ${describeType(actual)}`);
    }

    if (propertySchema.enum && !propertySchema.enum.includes(actual)) {
      errors.push(`property "${key}" expected one of ${propertySchema.enum.join(', ')}`);
    }
  }

  return errors;
}

describe('reference adapter definitions', () => {
  it('validates fixtures against config schemas', () => {
    const errors: string[] = [];

    for (const adapter of referenceAdapters) {
      const validationErrors = validateConfig(adapter);
      if (validationErrors.length > 0) {
        errors.push(`${adapter.manifest.name}: ${validationErrors.join('; ')}`);
      }

      expect(adapter.capabilities.length).toBeGreaterThan(0);
      for (const capability of adapter.capabilities) {
        expect(capability.id).toBeTruthy();
        expect(capability.title).toBeTruthy();
        expect(capability.inputs.length).toBeGreaterThan(0);
        expect(capability.outputs.length).toBeGreaterThan(0);
      }
    }

    expect(errors).toEqual([]);
  });

  it('produces signed bundles that verify', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'reference-adapters-'));
    try {
      const artifacts = buildReferenceBundles({ outputDir: tempDir });
      expect(artifacts.length).toBe(referenceAdapters.length);

      for (const artifact of artifacts) {
        const payload = readFileSync(artifact.bundlePath, 'utf8');
        const signatureFile = JSON.parse(readFileSync(artifact.signaturePath, 'utf8'));
        const signature = signatureFile.signature ?? signatureFile;

        const digest = createHash('sha256').update(payload).digest('hex');
        expect(signature.digest).toBe(digest);
        expect(verifySignature(payload, signature)).toBe(true);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
