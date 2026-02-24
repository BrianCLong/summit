import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildManifest,
  resolveFixtureEntries,
  stableStringify,
} from '../bundle-lib.mjs';

test('stableStringify sorts object keys deterministically', () => {
  const value = { b: 2, a: { d: 4, c: 3 } };
  const output = stableStringify(value);
  assert.equal(output, '{"a":{"c":3,"d":4},"b":2}\n');
});

test('resolveFixtureEntries rejects path traversal', async () => {
  const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'inference-'));
  await fs.writeFile(path.join(fixtureDir, 'ok.txt'), 'ok');
  await assert.rejects(
    resolveFixtureEntries(fixtureDir, ['../oops.txt']),
    /Path traversal is not allowed/,
  );
});

test('buildManifest requires entrypoints in include list', async () => {
  const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'inference-'));
  const filePath = path.join(fixtureDir, 'model.txt');
  await fs.writeFile(filePath, 'model');
  const entries = [
    {
      relativePath: 'model.txt',
      absolutePath: filePath,
    },
  ];
  await assert.rejects(
    buildManifest({ main: 'missing.txt' }, entries, {}),
    /Entrypoint path not in include list/,
  );
});
