import { describe, it } from 'node:test';
import assert from 'node:assert';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'schemas/jules-provenance.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

describe('Jules Provenance Schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);
  const validate = ajv.compile(schema);

  it('valid provenance block', () => {
    const validData = {
      provenance: {
        generator: 'Jules',
        timestamp: new Date().toISOString(),
        seed_commit: 'abc1234',
        requirements_summary: 'Some summary',
        verification: 'passed'
      }
    };
    const valid = validate(validData);
    if (!valid) console.error(validate.errors);
    assert.strictEqual(valid, true);
  });

  it('invalid generator', () => {
    const invalidData = {
        provenance: {
            generator: 'Other',
            timestamp: new Date().toISOString(),
            seed_commit: 'abc1234',
            verification: 'passed'
        }
    };
    assert.strictEqual(validate(invalidData), false);
  });

  it('invalid verification status', () => {
      const invalidData = {
          provenance: {
              generator: 'Jules',
              timestamp: new Date().toISOString(),
              seed_commit: 'abc1234',
              verification: 'unknown'
          }
      };
      assert.strictEqual(validate(invalidData), false);
  });
});

describe('Jules Artifacts Existence', () => {
    it('CI template exists', () => {
        const templatePath = path.join(process.cwd(), 'templates/jules/ci-workflow.yml');
        assert.strictEqual(fs.existsSync(templatePath), true);
    });

    it('OPA policy exists', () => {
        const policyPath = path.join(process.cwd(), 'policy/jules/pr_invariants.rego');
        assert.strictEqual(fs.existsSync(policyPath), true);
    });
});
