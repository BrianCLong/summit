import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import { CapabilityRegistry } from './types';

export function validateAgainstSchema(
  registry: CapabilityRegistry,
  schemaPath: string,
): string[] {
  if (!fs.existsSync(schemaPath)) {
    return [`Schema not found: ${schemaPath}`];
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(registry);
  if (valid) {
    return [];
  }
  return (validate.errors || []).map((err) =>
    `${err.instancePath || 'registry'} ${err.message || 'invalid'}`.trim(),
  );
}

export function resolveSchemaPath(repoRoot: string): string {
  return path.join(repoRoot, 'capability-fabric', 'schemas', 'capability.schema.json');
}
