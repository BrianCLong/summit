import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { signResultBundle, ResultBundlePayload } from './sign-result';

describe('signResultBundle', () => {
  it('should create a valid signature using ed25519', () => {
    // Generate a test keypair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');

    const privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });

    const payload: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: { status: 'success' },
      metrics: { score: 95 },
      stamp: { timestamp: '2023-01-01T00:00:00Z' }
    };

    const signedBundle = signResultBundle(payload, privateKeyHex);

    expect(signedBundle.signature).toBeDefined();
    expect(signedBundle.signature.length).toBeGreaterThan(0);
    expect(signedBundle.protocolVersion).toBe(payload.protocolVersion);
    expect(signedBundle.benchmarkVersion).toBe(payload.benchmarkVersion);

    // Verify manually
    const dataToVerify = Buffer.from(JSON.stringify(payload));
    const signatureBuffer = Buffer.from(signedBundle.signature, 'hex');
    const keyObject = crypto.createPublicKey({
      key: publicKeyDer,
      format: 'der',
      type: 'spki'
    });
    const isValid = crypto.verify(null, dataToVerify, keyObject, signatureBuffer);

    expect(isValid).toBe(true);
  });
});
