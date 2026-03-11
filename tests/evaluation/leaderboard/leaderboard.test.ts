import * as crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert';
import { signResultBundle } from '../../../evaluation/leaderboard/sign-result.ts';
import { verifyResultBundle } from '../../../evaluation/security/verify-result.ts';
import { createLeaderboardEntry, aggregateLeaderboard } from '../../../evaluation/leaderboard/aggregate.ts';

test('Leaderboard Infrastructure', async (t) => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const privateKeyHex = privateKey.export({ format: 'der', type: 'pkcs8' }).toString('hex');
  const publicKeyHex = publicKey.export({ format: 'der', type: 'spki' }).toString('hex');

  const payload1 = () => ({
    protocolVersion: "1.0",
    benchmarkVersion: "2.0",
    report: { agentName: "AgentAlpha" },
    metrics: { totalScore: 85, tasksCompleted: 10 },
    stamp: { timestamp: "2024-02-01T00:00:00Z" }
  });

  const payload2 = () => ({
    protocolVersion: "1.0",
    benchmarkVersion: "2.0",
    report: { agentName: "AgentBeta" },
    metrics: { totalScore: 95, tasksCompleted: 12 },
    stamp: { timestamp: "2024-02-02T00:00:00Z" }
  });

  await t.test('signResultBundle should sign a bundle correctly', () => {
    const bundle = signResultBundle(payload1(), privateKeyHex);
    assert.strictEqual(bundle.report.agentName, 'AgentAlpha');
    assert.ok(bundle.signature);
    assert.strictEqual(typeof bundle.signature, 'string');
  });

  await t.test('verifyResultBundle should verify a valid signature', () => {
    const bundle = signResultBundle(payload1(), privateKeyHex);
    const isValid = verifyResultBundle(bundle, publicKeyHex);
    assert.strictEqual(isValid, true);
  });

  await t.test('verifyResultBundle should reject an invalid signature', () => {
    const bundle = signResultBundle(payload1(), privateKeyHex);
    bundle.metrics.totalScore = 90; // tamper with data
    const isValid = verifyResultBundle(bundle, publicKeyHex);
    assert.strictEqual(isValid, false);
  });

  await t.test('createLeaderboardEntry should map bundle to entry', () => {
    const bundle = signResultBundle(payload1(), privateKeyHex);
    const entry = createLeaderboardEntry(bundle, true);
    assert.strictEqual(entry.agentName, 'AgentAlpha');
    assert.strictEqual(entry.totalScore, 85);
    assert.strictEqual(entry.tasksCompleted, 10);
    assert.strictEqual(entry.timestamp, "2024-02-01T00:00:00Z");
    assert.strictEqual(entry.verified, true);
  });

  await t.test('aggregateLeaderboard should sort entries by score', () => {
    const bundle1 = signResultBundle(payload1(), privateKeyHex);
    const bundle2 = signResultBundle(payload2(), privateKeyHex);

    const entry1 = createLeaderboardEntry(bundle1, true);
    const entry2 = createLeaderboardEntry(bundle2, true);

    const leaderboard = aggregateLeaderboard([entry1, entry2]);

    assert.ok(leaderboard.lastUpdated);
    assert.strictEqual(leaderboard.entries.length, 2);
    assert.strictEqual(leaderboard.entries[0].agentName, 'AgentBeta'); // 95 > 85
    assert.strictEqual(leaderboard.entries[1].agentName, 'AgentAlpha');
  });
});
