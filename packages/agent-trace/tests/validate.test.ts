import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateTraceRecord } from '../src/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('validateTraceRecord with minimal valid record', () => {
  const data = JSON.parse(readFileSync(join(__dirname, 'fixtures/valid/minimal.json'), 'utf8'));
  const result = validateTraceRecord(data);
  assert.strictEqual(result.valid, true, `Expected valid, got errors: ${result.errors?.join(', ')}`);
});

test('validateTraceRecord with missing files', () => {
  const data = JSON.parse(readFileSync(join(__dirname, 'fixtures/invalid/missing_files.json'), 'utf8'));
  const result = validateTraceRecord(data);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors?.some(e => e.includes('required property \'files\'')));
});

test('validateTraceRecord with bad UUID', () => {
  const data = JSON.parse(readFileSync(join(__dirname, 'fixtures/invalid/bad_uuid.json'), 'utf8'));
  const result = validateTraceRecord(data);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors?.some(e => e.includes('must match format "uuid"')));
});

test('validateTraceRecord with invalid line bounds', () => {
  const data = JSON.parse(readFileSync(join(__dirname, 'fixtures/valid/minimal.json'), 'utf8'));
  data.files[0].conversations[0].ranges[0].start_line = 100;
  data.files[0].conversations[0].ranges[0].end_line = 50;
  const result = validateTraceRecord(data);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors?.some(e => e.includes('start_line (100) > end_line (50)')));
});
