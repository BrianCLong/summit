import test from 'node:test';
import assert from 'node:assert';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import type { ResultBundlePayload } from './sign-result.ts';
import { signResultBundle } from './sign-result.ts';
import { verifyResultBundle } from './verify-result.ts';
import { aggregateScores, writeLeaderboard } from './aggregate-scores.ts';

test('Leaderboard utilities', async (t) => {
  // Generate ed25519 key pair for testing
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  const privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
  const publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');

  const basePayload: ResultBundlePayload = {
    protocolVersion: '1.0',
    benchmarkVersion: '0.1.0',
    report: { submitterId: 'test-agent' },
    metrics: { overallScore: 95 },
    stamp: { timestamp: '2023-10-01T12:00:00Z' }
  };

  await t.test('signResultBundle signs a payload correctly', () => {
    const signed = signResultBundle(basePayload, privateKeyHex);
    assert.ok(signed.signature, 'Signature should be generated');
    assert.strictEqual(typeof signed.signature, 'string');
    assert.strictEqual(signed.protocolVersion, '1.0');
  });

  await t.test('verifyResultBundle verifies valid signature correctly', () => {
    const signed = signResultBundle(basePayload, privateKeyHex);
    const isValid = verifyResultBundle(signed, publicKeyHex);
    assert.strictEqual(isValid, true, 'Valid signature should be verified');
  });

  await t.test('verifyResultBundle rejects invalid signature', () => {
    const signed = signResultBundle(basePayload, privateKeyHex);
    // Tamper with the payload
    signed.metrics.overallScore = 99;

    const isValid = verifyResultBundle(signed, publicKeyHex);
    assert.strictEqual(isValid, false, 'Tampered payload should result in invalid signature');
  });

  await t.test('verifyResultBundle rejects signature tampered', () => {
    const signed = signResultBundle(basePayload, privateKeyHex);
    // Tamper with the signature string
    signed.signature = signed.signature.replace('a', 'b').replace('1', '2');

    const isValid = verifyResultBundle(signed, publicKeyHex);
    assert.strictEqual(isValid, false, 'Tampered signature should result in invalid verification');
  });

  await t.test('aggregateScores aggregates and sorts valid entries correctly', () => {
    const payloads: ResultBundlePayload[] = [
      {
        ...basePayload,
        report: { submitterId: 'agent-1' },
        metrics: { overallScore: 80 }
      },
      {
        ...basePayload,
        report: { submitterId: 'agent-2' },
        metrics: { overallScore: 95 }
      },
      {
        ...basePayload,
        report: { submitterId: 'agent-3' },
        metrics: { overallScore: 95 }
      }
    ];

    const signedBundles = payloads.map(p => signResultBundle(p, privateKeyHex));

    // Create an invalid bundle
    const invalidBundle = signResultBundle({ ...basePayload, report: { submitterId: 'agent-fake' } }, privateKeyHex);
    invalidBundle.metrics.overallScore = 100; // Tamper score

    const allBundles = [...signedBundles, invalidBundle];

    const entries = aggregateScores(allBundles, publicKeyHex);

    assert.strictEqual(entries.length, 3, 'Should only aggregate valid entries');

    // Test sorting:
    // 1st: agent-2 (score 95, id earlier than agent-3)
    assert.strictEqual(entries[0].submitterId, 'agent-2');
    assert.strictEqual(entries[0].score, 95);

    // 2nd: agent-3 (score 95)
    assert.strictEqual(entries[1].submitterId, 'agent-3');
    assert.strictEqual(entries[1].score, 95);

    // 3rd: agent-1 (score 80)
    assert.strictEqual(entries[2].submitterId, 'agent-1');
    assert.strictEqual(entries[2].score, 80);
  });

  await t.test('writeLeaderboard creates JSON file with data', () => {
    // Determine __dirname for ES modules
    const { fileURLToPath } = require('node:url');
    const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath('file://' + path.resolve('evaluation/leaderboard/leaderboard.test.ts')));

    const testOutputPath = path.join(dirname, 'test-leaderboard.json');

    const entries = [
      {
        submitterId: 'test-agent',
        score: 95,
        timestamp: '2023-10-01T12:00:00Z',
        protocolVersion: '1.0',
        benchmarkVersion: '0.1.0'
      }
    ];

    writeLeaderboard(entries, testOutputPath);

    assert.ok(fs.existsSync(testOutputPath), 'File should be created');

    const content = fs.readFileSync(testOutputPath, 'utf8');
    const parsed = JSON.parse(content);

    assert.ok(parsed.lastUpdated, 'Should include lastUpdated timestamp');
    assert.deepStrictEqual(parsed.entries, entries, 'Entries should match exactly');

    // Clean up
    fs.unlinkSync(testOutputPath);
  });
});
