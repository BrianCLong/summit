import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });
const schema = JSON.parse(fs.readFileSync('runbook.schema.json', 'utf8'));

describe('Runbook manifest schema', () => {
  it('validates example runbook', () => {
    const rb = JSON.parse(
      fs.readFileSync(
        '../examples/runbooks/backfill-entity-resolver.json',
        'utf8',
      ),
    );
    const validate = ajv.compile(schema);
    expect(validate(rb)).toBe(true);
  });
});
