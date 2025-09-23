import { LocalKms } from '../server/src/crypto/localKms';

describe('KMS Key Rotation', () => {
  const kms = new LocalKms();
  const initialKeyAlias = 'tenant/t1/pii';
  const rotatedKeyAlias = 'tenant/t1/pii'; // In this model, the alias is stable, the underlying KEK version changes

  it('should rewrap a Data Encryption Key (DEK) with a new Key Encryption Key (KEK)', async () => {
    // 1. Generate an initial DEK wrapped with the first KEK version
    const { keyId: initialKid, dekWrapped: initialDekWrapped } = await kms.generateDek(initialKeyAlias);
    expect(initialKid).toContain('-v1');

    // 2. Simulate a key rotation by re-wrapping the DEK
    const { keyId: newKid, dekWrapped: newDekWrapped } = await kms.rewrapDek(initialKid, rotatedKeyAlias, initialDekWrapped);

    // 3. Assert that the new Key ID indicates a version bump
    expect(newKid).not.toEqual(initialKid);
    expect(newKid).toContain('-v2');

    // 4. Assert that the wrapped DEK ciphertext has changed
    expect(newDekWrapped).not.toEqual(initialDekWrapped);

    // 5. Verify that the new wrapped DEK can be decrypted (and it's the same original DEK)
    const originalDek = await kms.decryptDek(initialKid, initialDekWrapped);
    const rewrappedDek = await kms.decryptDek(newKid, newDekWrapped);
    expect(rewrappedDek).toEqual(originalDek);
  });
});
