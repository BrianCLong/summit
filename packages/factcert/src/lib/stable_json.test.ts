import { stableStringify } from './stable_json';
import { generateEd25519KeyPair, signDetached, verifyDetached } from './ed25519';

describe('FactCert Libs', () => {
  test('stableStringify is deterministic', () => {
    const obj1 = { b: 2, a: 1, c: [3, 2, 1] };
    const obj2 = { a: 1, c: [3, 2, 1], b: 2 };
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
    expect(stableStringify(obj1)).toBe('{"a":1,"b":2,"c":[3,2,1]}');
  });

  test('Ed25519 signing and verification', () => {
    const keys = generateEd25519KeyPair();
    const message = new TextEncoder().encode('Hello FactCert');

    const signature = signDetached(message, keys.secretKey);
    const isValid = verifyDetached(signature, message, keys.publicKey);

    expect(isValid).toBe(true);

    const badMessage = new TextEncoder().encode('Bad Message');
    expect(verifyDetached(signature, badMessage, keys.publicKey)).toBe(false);
  });
});
