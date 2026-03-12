import * as crypto from 'node:crypto';
import { signResultBundle, ResultBundlePayload } from './sign-result';
import { verifyResultBundle } from './verify-result';
import { aggregateScores, generateLeaderboardJSON } from './aggregate';

describe('Leaderboard Utils', () => {
  let publicKeyHex: string;
  let privateKeyHex: string;

  beforeAll(() => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
    privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
  });

  const mockPayload: ResultBundlePayload = {
    protocolVersion: '1.0',
    benchmarkVersion: 'v1.2.0',
    report: { model: 'test-model-alpha' },
    metrics: { overall_score: 95.5 },
    stamp: { timestamp: '2023-10-01T12:00:00Z' }
  };

  it('signs and verifies a bundle successfully', () => {
    const signed = signResultBundle(mockPayload, privateKeyHex);
    expect(signed.signature).toBeDefined();

    const isValid = verifyResultBundle(signed, publicKeyHex);
    expect(isValid).toBe(true);
  });

  it('fails verification if signature is tampered', () => {
    const signed = signResultBundle(mockPayload, privateKeyHex);
    signed.signature = signed.signature.replace('a', 'b'); // Tamper signature

    const isValid = verifyResultBundle(signed, publicKeyHex);
    expect(isValid).toBe(false);
  });

  it('aggregates scores correctly', () => {
    const bundle1 = signResultBundle(mockPayload, privateKeyHex);
    const bundle2 = signResultBundle({
      ...mockPayload,
      report: { model: 'test-model-beta' },
      metrics: { overall_score: 98.0 }
    }, privateKeyHex);

    const scores = aggregateScores([bundle1, bundle2]);
    expect(scores).toHaveLength(2);
    expect(scores[0].model).toBe('test-model-beta'); // sorted desc
    expect(scores[0].score).toBe(98.0);
    expect(scores[1].model).toBe('test-model-alpha');
    expect(scores[1].score).toBe(95.5);
  });

  it('generates leaderboard JSON', () => {
    const bundle1 = signResultBundle(mockPayload, privateKeyHex);
    const jsonStr = generateLeaderboardJSON([bundle1]);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.entries).toBeDefined();
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].model).toBe('test-model-alpha');
  });
});
