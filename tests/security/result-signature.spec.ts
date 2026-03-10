import * as crypto from 'node:crypto';
import { test, describe, before } from 'node:test';
import * as assert from 'node:assert';
import { signResultBundle, ResultBundlePayload } from '../../evaluation/leaderboard/sign-result';
import { verifyResultBundle } from '../../evaluation/security/verify-result';

describe('Benchmark Result Signature Protocol', () => {
  let publicKeyHex: string;
  let privateKeyHex: string;
  let testPayload: ResultBundlePayload;

  before(() => {
    // Generate an ed25519 keypair for testing
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

    publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
    privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');

    testPayload = {
      protocolVersion: '1.0',
      benchmarkVersion: '1.2.0',
      report: { status: 'success', score: 95 },
      metrics: { latency: 10, throughput: 100 },
      stamp: { timestamp: new Date().toISOString() }
    };
  });

  test('should sign a result bundle and verify it successfully', () => {
    const signedBundle = signResultBundle(testPayload, privateKeyHex);

    assert.ok(signedBundle.signature !== undefined);
    assert.strictEqual(typeof signedBundle.signature, 'string');

    // The payload data should remain intact
    assert.strictEqual(signedBundle.protocolVersion, testPayload.protocolVersion);
    assert.strictEqual(signedBundle.benchmarkVersion, testPayload.benchmarkVersion);
    assert.deepStrictEqual(signedBundle.report, testPayload.report);

    // Verification should pass
    const isValid = verifyResultBundle(signedBundle, publicKeyHex);
    assert.strictEqual(isValid, true);
  });

  test('should reject a bundle if the signature is invalid (wrong key)', () => {
    const signedBundle = signResultBundle(testPayload, privateKeyHex);

    // Generate a new unrelated keypair
    const { publicKey: fakePublicKey } = crypto.generateKeyPairSync('ed25519');
    const fakePublicKeyHex = fakePublicKey.export({ type: 'spki', format: 'der' }).toString('hex');

    // Verification should fail with the wrong public key
    const isValid = verifyResultBundle(signedBundle, fakePublicKeyHex);
    assert.strictEqual(isValid, false);
  });

  test('should reject a bundle if the payload has been tampered with', () => {
    const signedBundle = signResultBundle(testPayload, privateKeyHex);

    // Tamper with the data
    signedBundle.report.score = 99;

    const isValid = verifyResultBundle(signedBundle, publicKeyHex);
    assert.strictEqual(isValid, false);
  });

  test('should return false on malformed signature or key', () => {
    const signedBundle = signResultBundle(testPayload, privateKeyHex);

    // Break the signature format
    signedBundle.signature = 'not-a-hex-string-that-is-valid-for-ed25519';

    const isValid = verifyResultBundle(signedBundle, publicKeyHex);
    assert.strictEqual(isValid, false);
  });
});
