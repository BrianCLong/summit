import { test, describe, before } from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { signResultBundle, ResultBundlePayload } from '../sign-result';
import { aggregateLeaderboard, publishLeaderboard, Leaderboard } from '../publish';

describe('Leaderboard Publishing Protocol', () => {
  let publicKeyHex: string;
  let privateKeyHex: string;
  let bundlePaths: string[] = [];
  let testDir: string;

  before(() => {
    // Generate an ed25519 keypair for testing
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
    privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');

    // Create a temporary directory for test bundles
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leaderboard-test-'));

    const payloads: ResultBundlePayload[] = [
      {
        protocolVersion: '1.0',
        benchmarkVersion: '1.2.0',
        report: { status: 'success', score: 95, modelName: 'Model A', submitter: 'Team X' },
        metrics: { latency: 10, throughput: 100 },
        stamp: { timestamp: new Date('2023-01-01').toISOString() }
      },
      {
        protocolVersion: '1.0',
        benchmarkVersion: '1.2.0',
        report: { status: 'success', score: 90, modelName: 'Model B', submitter: 'Team Y' },
        metrics: { latency: 15, throughput: 90 },
        stamp: { timestamp: new Date('2023-01-02').toISOString() }
      },
      {
        protocolVersion: '1.0',
        benchmarkVersion: '1.2.0',
        report: { status: 'success', score: 99, modelName: 'Model C', submitter: 'Team Z' },
        metrics: { latency: 5, throughput: 110 },
        stamp: { timestamp: new Date('2023-01-03').toISOString() }
      }
    ];

    payloads.forEach((payload, index) => {
      const signedBundle = signResultBundle(payload, privateKeyHex);
      const bundlePath = path.join(testDir, `bundle-${index}.json`);
      fs.writeFileSync(bundlePath, JSON.stringify(signedBundle), 'utf8');
      bundlePaths.push(bundlePath);
    });

    // Create a bundle with a different benchmark version
    const diffVersionPayload: ResultBundlePayload = {
        protocolVersion: '1.0',
        benchmarkVersion: '1.3.0',
        report: { status: 'success', score: 98, modelName: 'Model D', submitter: 'Team W' },
        metrics: { latency: 8, throughput: 105 },
        stamp: { timestamp: new Date('2023-01-04').toISOString() }
    };
    const signedDiffBundle = signResultBundle(diffVersionPayload, privateKeyHex);
    const diffBundlePath = path.join(testDir, 'bundle-diff.json');
    fs.writeFileSync(diffBundlePath, JSON.stringify(signedDiffBundle), 'utf8');
    bundlePaths.push(diffBundlePath); // This should be filtered out by aggregateLeaderboard

    // Create an invalid signature bundle
    const invalidPayload: ResultBundlePayload = {
        protocolVersion: '1.0',
        benchmarkVersion: '1.2.0',
        report: { status: 'success', score: 97, modelName: 'Model E', submitter: 'Team V' },
        metrics: { latency: 9, throughput: 102 },
        stamp: { timestamp: new Date('2023-01-05').toISOString() }
    };
    const { privateKey: fakePrivateKey } = crypto.generateKeyPairSync('ed25519');
    const fakePrivateKeyHex = fakePrivateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const signedInvalidBundle = signResultBundle(invalidPayload, fakePrivateKeyHex);
    const invalidBundlePath = path.join(testDir, 'bundle-invalid.json');
    fs.writeFileSync(invalidBundlePath, JSON.stringify(signedInvalidBundle), 'utf8');
    bundlePaths.push(invalidBundlePath); // This should be filtered out by aggregateLeaderboard
  });

  test('should aggregate leaderboard from valid bundles', () => {
    const leaderboard = aggregateLeaderboard(bundlePaths, publicKeyHex);

    assert.strictEqual(leaderboard.benchmarkVersion, '1.2.0');
    assert.strictEqual(leaderboard.entries.length, 3); // 3 valid bundles with matching version

    // Verify sorting (descending by score)
    assert.strictEqual(leaderboard.entries[0].score, 99);
    assert.strictEqual(leaderboard.entries[0].modelName, 'Model C');
    assert.strictEqual(leaderboard.entries[1].score, 95);
    assert.strictEqual(leaderboard.entries[1].modelName, 'Model A');
    assert.strictEqual(leaderboard.entries[2].score, 90);
    assert.strictEqual(leaderboard.entries[2].modelName, 'Model B');
  });

  test('should publish leaderboard to JSON file', () => {
    const leaderboard = aggregateLeaderboard(bundlePaths.slice(0, 3), publicKeyHex); // use only the 3 valid ones
    const outputPath = path.join(testDir, 'leaderboard.json');

    publishLeaderboard(leaderboard, outputPath);

    assert.ok(fs.existsSync(outputPath));

    const publishedContent = fs.readFileSync(outputPath, 'utf8');
    const publishedLeaderboard: Leaderboard = JSON.parse(publishedContent);

    assert.strictEqual(publishedLeaderboard.benchmarkVersion, '1.2.0');
    assert.strictEqual(publishedLeaderboard.entries.length, 3);
    assert.strictEqual(publishedLeaderboard.entries[0].score, 99);
  });
});
