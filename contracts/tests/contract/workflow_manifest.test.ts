import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);
const schema = JSON.parse(fs.readFileSync('workflow.schema.json', 'utf8'));

import { parse } from 'yaml';

function loadYaml(file: string) {
  // Minimal YAML loader stub; replace with 'yaml' pkg if desired
  return parse(fs.readFileSync(file, 'utf8')) as any;
}

describe('Workflow manifest schema', () => {
  it('validates example manifest', () => {
    const manifest = loadYaml(
      '../examples/workflows/ingest-enrich-handoff.yaml',
    );
    const validate = ajv.compile(schema);
    const ok = validate(manifest);
    if (!ok) {
      // validate.errors
    }
    expect(ok).toBe(true);
  });

  it('fails on missing policy fields', () => {
    const m = {
      apiVersion: 'maestro/v1',
      kind: 'Workflow',
      metadata: { name: 'x', version: '1.0.0' },
      spec: { tasks: [] },
    } as any;
    const validate = ajv.compile(schema);
    expect(validate(m)).toBe(false);
  });
});
