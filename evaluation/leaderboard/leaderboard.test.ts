import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { signResultBundle, ResultBundlePayload } from './sign-result';
import { generateLeaderboard } from './leaderboard';

describe('generateLeaderboard', () => {
  it('should generate a sorted leaderboard from valid bundles', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');

    const payload1: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: {},
      metrics: { score: 80 },
      stamp: {}
    };

    const payload2: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: {},
      metrics: { score: 95 },
      stamp: {}
    };

    const payload3: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: {},
      metrics: { score: 90 },
      stamp: {}
    };

    const bundles = [
      signResultBundle(payload1, privateKeyHex),
      signResultBundle(payload2, privateKeyHex),
      signResultBundle(payload3, privateKeyHex)
    ];

    const leaderboard = generateLeaderboard(bundles, publicKeyHex);

    expect(leaderboard).toHaveLength(3);
    expect(leaderboard[0].score).toBe(95);
    expect(leaderboard[1].score).toBe(90);
    expect(leaderboard[2].score).toBe(80);
  });

  it('should ignore bundles with invalid signatures', () => {
    const { privateKey: privateKey1, publicKey: publicKey1 } = crypto.generateKeyPairSync('ed25519');
    const { privateKey: privateKey2 } = crypto.generateKeyPairSync('ed25519');

    const privateKeyHex1 = privateKey1.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const privateKeyHex2 = privateKey2.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const publicKeyHex1 = publicKey1.export({ type: 'spki', format: 'der' }).toString('hex');

    const payload1: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: {},
      metrics: { score: 85 },
      stamp: {}
    };

    const payload2: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: {},
      metrics: { score: 100 },
      stamp: {}
    };

    const bundles = [
      signResultBundle(payload1, privateKeyHex1),
      signResultBundle(payload2, privateKeyHex2) // Signed with a different key
    ];

    // Tamper with the first valid bundle to test another invalidity scenario
    const invalidBundle = signResultBundle(payload1, privateKeyHex1);
    invalidBundle.signature = invalidBundle.signature.replace('0', '1').replace('a', 'b');
    bundles.push(invalidBundle);

    const leaderboard = generateLeaderboard(bundles, publicKeyHex1);

    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].score).toBe(85);
  });

  it('should default missing scores to 0', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');

    const payload: ResultBundlePayload = {
      protocolVersion: '1.0',
      benchmarkVersion: 'v1.0.0',
      report: {},
      metrics: { otherMetric: 123 }, // No score
      stamp: {}
    };

    const bundles = [signResultBundle(payload, privateKeyHex)];
    const leaderboard = generateLeaderboard(bundles, publicKeyHex);

    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].score).toBe(0);
  });
});
