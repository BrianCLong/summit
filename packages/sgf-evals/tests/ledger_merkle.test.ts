import { test } from 'node:test';
import assert from 'node:assert';
import { merkleRoot, h } from '@summit/sgf-ledger';
import { canonicalJson, sha256Bytes } from '@summit/sgf-evidence';

test('merkleRoot computes deterministic root for empty leaves', () => {
  const root = merkleRoot([]);
  const expected = h(Buffer.from("EMPTY"));
  assert.strictEqual(root.toString('hex'), expected.toString('hex'));
});

test('merkleRoot computes deterministic root for single leaf', () => {
  const leaf = Buffer.from('hello');
  const root = merkleRoot([leaf]);
  const expected = h(leaf);
  assert.strictEqual(root.toString('hex'), expected.toString('hex'));
});

test('merkleRoot computes deterministic root for multiple leaves', () => {
  const leaves = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];
  const root1 = merkleRoot(leaves);
  const root2 = merkleRoot(leaves);
  assert.strictEqual(root1.toString('hex'), root2.toString('hex'));
});

test('canonicalJson produces deterministic output regardless of key order', () => {
  const obj1 = { a: 1, b: 2, c: { x: 1, y: 2 } };
  const obj2 = { c: { y: 2, x: 1 }, b: 2, a: 1 };

  const buf1 = canonicalJson(obj1);
  const buf2 = canonicalJson(obj2);

  assert.strictEqual(buf1.toString(), buf2.toString());
  assert.strictEqual(sha256Bytes(buf1), sha256Bytes(buf2));
});
