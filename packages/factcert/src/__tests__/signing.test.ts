import { describe, it, expect } from 'vitest';
import { generateEd25519KeyPair, sign, verify } from '../lib/ed25519.js';

describe('signing', () => {
  it('generates keys and signs messages', () => {
    const { publicKey, privateKey } = generateEd25519KeyPair();
    const message = 'hello world';
    const signature = sign(message, privateKey);

    expect(verify(message, signature, publicKey)).toBe(true);
    expect(verify('wrong message', signature, publicKey)).toBe(false);
  });
});
