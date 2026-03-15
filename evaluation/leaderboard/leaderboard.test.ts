import { describe, it, expect, beforeAll } from 'vitest';
import * as crypto from 'node:crypto';
import { ResultBundlePayload, signResultBundle } from './sign-result';
import { verifyResultBundle } from './verify-result';
import { aggregateLeaderboard } from './aggregate-scores';

describe('Leaderboard Utilities', () => {
  let privateKeyHex: string;
  let publicKeyHex: string;
  let invalidPublicKeyHex: string;

  beforeAll(() => {
    const keyPair = crypto.generateKeyPairSync('ed25519');

    privateKeyHex = keyPair.privateKey.export({
      format: 'der',
      type: 'pkcs8'
    }).toString('hex');

    publicKeyHex = keyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }).toString('hex');

    const invalidKeyPair = crypto.generateKeyPairSync('ed25519');
    invalidPublicKeyHex = invalidKeyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }).toString('hex');
  });

  const mockPayload: ResultBundlePayload = {
    protocolVersion: '1.0',
    benchmarkVersion: 'v1.0.0',
    report: { agentId: 'test-agent', submitterId: 'user-1' },
    metrics: { score: 95.5 },
    stamp: { timestamp: '2023-10-27T10:00:00Z' }
  };

  describe('Signing and Verification', () => {
    it('should sign and successfully verify a valid result bundle', () => {
      const signedBundle = signResultBundle(mockPayload, privateKeyHex);
      expect(signedBundle.signature).toBeDefined();

      const isValid = verifyResultBundle(signedBundle, publicKeyHex);
      expect(isValid).toBe(true);
    });

    it('should fail verification if the signature is invalid (wrong public key)', () => {
      const signedBundle = signResultBundle(mockPayload, privateKeyHex);

      const isValid = verifyResultBundle(signedBundle, invalidPublicKeyHex);
      expect(isValid).toBe(false);
    });

    it('should fail verification if the payload is tampered with', () => {
      const signedBundle = signResultBundle(mockPayload, privateKeyHex);

      // Tamper with the score
      signedBundle.metrics.score = 99.9;

      const isValid = verifyResultBundle(signedBundle, publicKeyHex);
      expect(isValid).toBe(false);
    });
  });

  describe('Score Aggregation', () => {
    it('should aggregate only verified bundles and sort them deterministically', () => {
      const payload1: ResultBundlePayload = {
        ...mockPayload,
        report: { agentId: 'agent-B', submitterId: 'user-2' },
        metrics: { score: 80.0 }
      };

      const payload2: ResultBundlePayload = {
        ...mockPayload,
        report: { agentId: 'agent-A', submitterId: 'user-1' },
        metrics: { score: 90.0 }
      };

      const payload3: ResultBundlePayload = {
        ...mockPayload,
        report: { agentId: 'agent-C', submitterId: 'user-3' },
        metrics: { score: 90.0 }
      };

      // Sign the valid bundles
      const signed1 = signResultBundle(payload1, privateKeyHex);
      const signed2 = signResultBundle(payload2, privateKeyHex);
      const signed3 = signResultBundle(payload3, privateKeyHex);

      // Create a tampered bundle
      const tampered = signResultBundle({ ...mockPayload, metrics: { score: 100.0 } }, privateKeyHex);
      tampered.metrics.score = 150.0; // Tampered payload, signature will be invalid

      const bundles = [signed1, tampered, signed3, signed2];

      const leaderboard = aggregateLeaderboard(bundles, publicKeyHex);

      // 1 tampered bundle should be ignored
      expect(leaderboard.entries.length).toBe(3);

      // Verify deterministic sorting (Score DESC, then AgentID ASC)
      expect(leaderboard.entries[0].score).toBe(90.0);
      expect(leaderboard.entries[0].agentId).toBe('agent-A');

      expect(leaderboard.entries[1].score).toBe(90.0);
      expect(leaderboard.entries[1].agentId).toBe('agent-C');

      expect(leaderboard.entries[2].score).toBe(80.0);
      expect(leaderboard.entries[2].agentId).toBe('agent-B');
    });
  });
});
