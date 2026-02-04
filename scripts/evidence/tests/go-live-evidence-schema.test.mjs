/**
 * Go-Live Evidence Schema Validation Tests
 *
 * Tests that the JSON schema correctly validates evidence bundles.
 *
 * Run with: node --test scripts/evidence/tests/go-live-evidence-schema.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, '../../../docs/evidence/schema/go_live_evidence.schema.json');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function loadSchema() {
  const content = fs.readFileSync(SCHEMA_PATH, 'utf8');
  return JSON.parse(content);
}

function loadFixture(name) {
  const content = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return JSON.parse(content);
}

function createValidator() {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  return ajv;
}

describe('Go-Live Evidence Schema', () => {
  test('schema file exists and is valid JSON', () => {
    assert.ok(fs.existsSync(SCHEMA_PATH), 'Schema file should exist');

    let schema;
    assert.doesNotThrow(() => {
      schema = loadSchema();
    }, 'Schema should be valid JSON');

    assert.strictEqual(schema.$schema, 'http://json-schema.org/draft-07/schema#');
    assert.strictEqual(schema.title, 'Go-Live Evidence Bundle');
  });

  test('valid evidence fixture passes validation', () => {
    const schema = loadSchema();
    const ajv = createValidator();
    const validate = ajv.compile(schema);

    const evidence = loadFixture('valid-evidence.json');
    const valid = validate(evidence);

    assert.strictEqual(valid, true, `Validation errors: ${JSON.stringify(validate.errors, null, 2)}`);
  });

  test('evidence missing required fields fails validation', () => {
    const schema = loadSchema();
    const ajv = createValidator();
    const validate = ajv.compile(schema);

    const evidence = loadFixture('invalid-missing-required.json');
    const valid = validate(evidence);

    assert.strictEqual(valid, false, 'Should fail validation for missing required fields');
    assert.ok(validate.errors.length > 0, 'Should have validation errors');

    // Should complain about missing checks and summary
    const errorPaths = validate.errors.map(e => e.instancePath || e.keyword);
    assert.ok(
      validate.errors.some(e => e.keyword === 'required'),
      'Should have "required" validation errors'
    );
  });

  test('evidence with invalid SHA pattern fails validation', () => {
    const schema = loadSchema();
    const ajv = createValidator();
    const validate = ajv.compile(schema);

    const evidence = loadFixture('invalid-bad-sha.json');
    const valid = validate(evidence);

    assert.strictEqual(valid, false, 'Should fail validation for invalid SHA');

    // Should complain about SHA pattern
    const shaError = validate.errors.find(
      e => e.instancePath === '/git/sha' && e.keyword === 'pattern'
    );
    assert.ok(shaError, 'Should have pattern validation error for git.sha');
  });

  test('schema requires all check types', () => {
    const schema = loadSchema();
    const ajv = createValidator();
    const validate = ajv.compile(schema);

    // Evidence with missing smoke check
    const evidence = {
      version: '1.0.0',
      generatedAt: '2026-01-28T12:00:00.000Z',
      git: {
        sha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        branch: 'main',
        dirty: false,
      },
      toolchain: {
        node: 'v20.10.0',
        pnpm: '10.26.0',
      },
      checks: {
        lint: { status: 'passed', startedAt: '2026-01-28T12:00:00.000Z', finishedAt: '2026-01-28T12:00:01.000Z' },
        build: { status: 'passed', startedAt: '2026-01-28T12:00:00.000Z', finishedAt: '2026-01-28T12:00:01.000Z' },
        test: { status: 'passed', startedAt: '2026-01-28T12:00:00.000Z', finishedAt: '2026-01-28T12:00:01.000Z' },
        // Missing smoke
      },
      summary: {
        passed: true,
        totalChecks: 3,
        passedChecks: 3,
        failedChecks: 0,
      },
    };

    const valid = validate(evidence);
    assert.strictEqual(valid, false, 'Should fail when smoke check is missing');

    const smokeError = validate.errors.find(
      e => e.instancePath === '/checks' && e.params?.missingProperty === 'smoke'
    );
    assert.ok(smokeError, 'Should specifically complain about missing smoke check');
  });

  test('check status must be valid enum value', () => {
    const schema = loadSchema();
    const ajv = createValidator();
    const validate = ajv.compile(schema);

    const evidence = loadFixture('valid-evidence.json');
    evidence.checks.lint.status = 'invalid-status';

    const valid = validate(evidence);
    assert.strictEqual(valid, false, 'Should fail for invalid status enum');

    const enumError = validate.errors.find(
      e => e.instancePath === '/checks/lint/status' && e.keyword === 'enum'
    );
    assert.ok(enumError, 'Should have enum validation error for invalid status');
  });

  test('version must follow semver pattern', () => {
    const schema = loadSchema();
    const ajv = createValidator();
    const validate = ajv.compile(schema);

    const evidence = loadFixture('valid-evidence.json');
    evidence.version = 'not-semver';

    const valid = validate(evidence);
    assert.strictEqual(valid, false, 'Should fail for invalid version format');

    const patternError = validate.errors.find(
      e => e.instancePath === '/version' && e.keyword === 'pattern'
    );
    assert.ok(patternError, 'Should have pattern validation error for version');
  });

  test('generatedAt must be valid ISO date-time', () => {
    const schema = loadSchema();
    const ajv = createValidator();
    const validate = ajv.compile(schema);

    const evidence = loadFixture('valid-evidence.json');
    evidence.generatedAt = 'not-a-date';

    const valid = validate(evidence);
    assert.strictEqual(valid, false, 'Should fail for invalid date-time');

    const formatError = validate.errors.find(
      e => e.instancePath === '/generatedAt' && e.keyword === 'format'
    );
    assert.ok(formatError, 'Should have format validation error for generatedAt');
  });
});
