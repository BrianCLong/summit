import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { generateKeyPairSync } from 'node:crypto';
import { signManifest } from '../sign.js';
import { verifyManifest } from '../verify.js';

describe('Evidence Attestation', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const manifest = {
    id: 'ev-123',
    timestamp: '2023-10-27T10:00:00Z',
    artifacts: ['art-1', 'art-2']
  };

  describe('Signer: none', () => {
    it('should produce predictable output', async () => {
      const signature = await signManifest(manifest, { signerType: 'none' });
      expect(signature).toContain('none:');

      const isValid = await verifyManifest(manifest, signature, { signerType: 'none' });
      expect(isValid).toBe(true);
    });

    it('should fail verification on tampered manifest', async () => {
      const signature = await signManifest(manifest, { signerType: 'none' });
      const tamperedManifest = { ...manifest, id: 'ev-666' };

      const isValid = await verifyManifest(tamperedManifest, signature, { signerType: 'none' });
      expect(isValid).toBe(false);
    });
  });

  describe('Signer: ed25519', () => {
    // Deterministic test keys (test-only)
    const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIBpc5We8d/qFf9jIP4LcY+I+nthzXCLGZlbQg1SYfU6z
-----END PRIVATE KEY-----`;

    const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA/lXmISOjqQVCE9OIWqP8y7oATdN9+FgtonD0XynSjzQ=
-----END PUBLIC KEY-----`;

    it('should throw if EVIDENCE_SIGNING_ENABLED is false (default)', async () => {
      delete process.env.EVIDENCE_SIGNING_ENABLED;
      await expect(signManifest(manifest, { signerType: 'ed25519', privateKey: privateKeyPem }))
        .rejects.toThrow('EVIDENCE_SIGNING_ENABLED is not enabled');
    });

    it('should sign and verify when enabled', async () => {
      process.env.EVIDENCE_SIGNING_ENABLED = 'true';

      const signature = await signManifest(manifest, { signerType: 'ed25519', privateKey: privateKeyPem });
      expect(signature).toContain('ed25519:');

      const isValid = await verifyManifest(manifest, signature, { signerType: 'ed25519', publicKey: publicKeyPem });
      expect(isValid).toBe(true);
    });

    it('should fail verification on tampered manifest', async () => {
      process.env.EVIDENCE_SIGNING_ENABLED = 'true';
      const signature = await signManifest(manifest, { signerType: 'ed25519', privateKey: privateKeyPem });

      const tamperedManifest = { ...manifest, artifacts: [] };
      const isValid = await verifyManifest(tamperedManifest, signature, { signerType: 'ed25519', publicKey: publicKeyPem });
      expect(isValid).toBe(false);
    });

    it('should fail verification with wrong key', async () => {
        process.env.EVIDENCE_SIGNING_ENABLED = 'true';
        const signature = await signManifest(manifest, { signerType: 'ed25519', privateKey: privateKeyPem });

        // Use a different key
        const otherKey = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=
-----END PUBLIC KEY-----`;
        // Note: the above might be invalid PEM structure for node crypto,
        // better to use a real generated one or just one that is structurally valid.
        // Let's generate another one.
        const { publicKey: validOtherKey } = generateKeyPairSync('ed25519', {
          publicKeyEncoding: { type: 'spki', format: 'pem' }
        });

        const validOtherKeyPem =
          typeof validOtherKey === 'string'
            ? validOtherKey
            : validOtherKey.export({ type: 'spki', format: 'pem' }).toString();

        const isValid = await verifyManifest(manifest, signature, { signerType: 'ed25519', publicKey: validOtherKeyPem });
        expect(isValid).toBe(false);
    });
  });
});
