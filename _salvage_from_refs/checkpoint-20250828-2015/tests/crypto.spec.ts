import { encryptField, decryptField } from '../server/src/crypto/envelope';
import { LocalKms } from '../server/src/crypto/localKms';

describe('Envelope Encryption', () => {
  const kms = new LocalKms();
  const keyAlias = 'test-tenant/pii';
  const plaintext = Buffer.from('this is a highly secret message', 'utf8');

  it('should correctly encrypt and decrypt a value', async () => {
    // Encrypt
    const encrypted = await encryptField(kms, keyAlias, plaintext);
    expect(encrypted).toBeDefined();
    expect(encrypted.ciphertext).not.toEqual(plaintext);

    // Decrypt
    const decrypted = await decryptField(kms, encrypted);
    expect(decrypted.toString('utf8')).toBe(plaintext.toString('utf8'));
  });

  it('should fail to decrypt if the ciphertext is tampered with', async () => {
    const encrypted = await encryptField(kms, keyAlias, plaintext);
    
    // Tamper with the ciphertext (flip a bit)
    encrypted.ciphertext[0] ^= 0xff;

    // Expect decryption to throw an error (GCM auth tag check will fail)
    await expect(decryptField(kms, encrypted)).rejects.toThrow('Unsupported state or unable to authenticate data');
  });

  it('should fail to decrypt if the IV is tampered with', async () => {
    const encrypted = await encryptField(kms, keyAlias, plaintext);
    
    // Tamper with the initialization vector
    encrypted.iv[0] ^= 0xff;

    await expect(decryptField(kms, encrypted)).rejects.toThrow();
  });

  it('should fail to decrypt if the auth tag is tampered with', async () => {
    const encrypted = await encryptField(kms, keyAlias, plaintext);
    
    // Tamper with the GCM authentication tag
    encrypted.tag[0] ^= 0xff;

    await expect(decryptField(kms, encrypted)).rejects.toThrow();
  });
});
