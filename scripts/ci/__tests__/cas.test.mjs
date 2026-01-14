import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { casPutFile, sha256Bytes, stableStringify } from '../lib/cas.mjs';

test('casPutFile writes blob and metadata', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cas-test-'));
  const casRoot = path.join(tempDir, 'cas');
  const filePath = path.join(tempDir, 'input.txt');

  await fs.writeFile(filePath, 'hello');

  const entry = await casPutFile({ casRoot, filePath });
  const blob = await fs.readFile(entry.casPath, 'utf8');
  const meta = JSON.parse(await fs.readFile(entry.metaPath, 'utf8'));

  assert.equal(blob, 'hello');
  assert.equal(meta.digest, entry.digest);
  assert.equal(meta.size, 5);
});

test('stableStringify sorts keys deterministically', () => {
  const input = { b: 2, a: 1, nested: { d: 4, c: 3 } };
  const output = stableStringify(input);
  const expected = '{\n  "a": 1,\n  "b": 2,\n  "nested": {\n    "c": 3,\n    "d": 4\n  }\n}\n';

  assert.equal(output, expected);
  assert.equal(sha256Bytes(Buffer.from(output)).length, 64);
});
