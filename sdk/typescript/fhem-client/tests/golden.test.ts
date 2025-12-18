import assert from 'node:assert/strict';
import { FhemClient } from '../src/index.js';

const client = new FhemClient();

const first = client.encrypt([11]);
const second = client.encrypt([11]);

assert.equal(first.ciphertexts.length, 1);
assert.equal(second.ciphertexts.length, 1);
assert.deepEqual(first.ciphertexts, second.ciphertexts);

console.log('Deterministic ciphertext check passed.');
