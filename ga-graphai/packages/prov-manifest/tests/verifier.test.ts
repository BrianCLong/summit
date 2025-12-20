import assert from 'node:assert';
import crypto from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import { toCanonicalPath, verifyManifest } from '../src/index.js';

const fixturesRoot = path.join(process.cwd(), 'tests', 'fixtures');

test('accepts a valid manifest bundle', async () => {
  const bundlePath = path.join(fixturesRoot, 'good-bundle');
  const report = await verifyManifest(bundlePath);
  assert.equal(report.valid, true);
  assert.equal(report.issues.length, 0);
  assert.ok(report.filesChecked > 0);
});

test('flags missing files', async () => {
  const bundlePath = path.join(fixturesRoot, 'missing-file-bundle');
  const report = await verifyManifest(bundlePath);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === 'MISSING_FILE'));
});

test('flags hash mismatches', async () => {
  const bundlePath = path.join(fixturesRoot, 'hash-mismatch-bundle');
  const report = await verifyManifest(bundlePath);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === 'HASH_MISMATCH'));
});

test('detects broken transform chains', async () => {
  const bundlePath = path.join(fixturesRoot, 'broken-transform-bundle');
  const report = await verifyManifest(bundlePath);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === 'TRANSFORM_BROKEN'));
});

test('path traversal safety property', () => {
  const root = '/tmp/bundle';
  for (let i = 0; i < 50; i += 1) {
    const token = crypto.randomBytes(4).toString('hex');
    const candidate = i % 2 === 0 ? `../${token}` : `/abs/${token}`;
    assert.throws(() => toCanonicalPath(root, candidate));
  }
});
