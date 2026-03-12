import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { signResultBundle, ResultBundlePayload } from './sign-result';
import { verifyResultBundle } from './verify-result';

describe('verifyResultBundle', () => {
  it('should verify a valid signature', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');

    const payload: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: { status: 'success' },
      metrics: { score: 95 },
      stamp: { timestamp: '2023-01-01T00:00:00Z' }
    };

    const signedBundle = signResultBundle(payload, privateKeyHex);

    const isValid = verifyResultBundle(signedBundle, publicKeyHex);
    expect(isValid).toBe(true);
  });

  it('should fail on an invalid signature', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');

    const payload: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: { status: 'success' },
      metrics: { score: 95 },
      stamp: { timestamp: '2023-01-01T00:00:00Z' }
    };

    const signedBundle = signResultBundle(payload, privateKeyHex);

    // Tamper with the signature
    signedBundle.signature = signedBundle.signature.replace('0', '1').replace('a', 'b');

    const isValid = verifyResultBundle(signedBundle, publicKeyHex);
    expect(isValid).toBe(false);
  });

  it('should fail if payload was tampered with', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');

    const payload: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: { status: 'success' },
      metrics: { score: 95 },
      stamp: { timestamp: '2023-01-01T00:00:00Z' }
    };

    const signedBundle = signResultBundle(payload, privateKeyHex);

    // Tamper with payload
    signedBundle.metrics.score = 99;

    const isValid = verifyResultBundle(signedBundle, publicKeyHex);
    expect(isValid).toBe(false);
  });

  it('should return false on invalid public key hex', () => {
    const { privateKey } = crypto.generateKeyPairSync('ed25519');
    const privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');

    const payload: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: { status: 'success' },
      metrics: { score: 95 },
      stamp: { timestamp: '2023-01-01T00:00:00Z' }
    };

    const signedBundle = signResultBundle(payload, privateKeyHex);

    const isValid = verifyResultBundle(signedBundle, 'invalid_hex_string');
    expect(isValid).toBe(false);
  });
});
