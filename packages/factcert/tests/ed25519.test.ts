import { describe, it, expect } from 'vitest';
import { generateKeypair, sign, verify } from '../src/lib/ed25519.js';

describe('Ed25519', () => {
  it('should sign and verify', () => {
    const keys = generateKeypair();
    const msg = "hello world";
    const sig = sign(msg, keys);

    expect(keys.publicKeyHex.length).toBe(64);
    expect(keys.privateKeyHex.length).toBe(64);
    expect(sig.length).toBe(128); // 64 bytes hex

    expect(verify(msg, sig, keys.publicKeyHex)).toBe(true);
    expect(verify("wrong message", sig, keys.publicKeyHex)).toBe(false);
  });

  it('should fail with wrong key', () => {
    const keys1 = generateKeypair();
    const keys2 = generateKeypair();
    const msg = "hello world";
    const sig = sign(msg, keys1);

    expect(verify(msg, sig, keys2.publicKeyHex)).toBe(false);
  });
});
