import { describe, it, expect, beforeEach } from 'vitest';
import { DifferentialPrivacyEngine, HomomorphicTallying } from '../src/privacy/differential-privacy.js';

describe('DifferentialPrivacyEngine', () => {
  let engine: DifferentialPrivacyEngine;

  beforeEach(() => {
    engine = new DifferentialPrivacyEngine({ epsilon: 1.0, delta: 1e-5, sensitivity: 1 });
  });

  describe('anonymizeVoter', () => {
    it('should generate consistent anonymous IDs for same voter/salt', () => {
      const result1 = engine.anonymizeVoter('voter-123', 'jurisdiction-A', 'salt-xyz');
      const result2 = engine.anonymizeVoter('voter-123', 'jurisdiction-A', 'salt-xyz');

      expect(result1.anonymousId).toBe(result2.anonymousId);
      expect(result1.participationToken).toBe(result2.participationToken);
    });

    it('should generate different IDs for different voters', () => {
      const result1 = engine.anonymizeVoter('voter-123', 'jurisdiction-A', 'salt-xyz');
      const result2 = engine.anonymizeVoter('voter-456', 'jurisdiction-A', 'salt-xyz');

      expect(result1.anonymousId).not.toBe(result2.anonymousId);
    });

    it('should include all required fields', () => {
      const result = engine.anonymizeVoter('voter-1', 'jur-1', 'salt');

      expect(result).toHaveProperty('anonymousId');
      expect(result).toHaveProperty('jurisdictionHash');
      expect(result).toHaveProperty('participationToken');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('addLaplaceNoise', () => {
    it('should add noise to values', () => {
      const original = 1000;
      const results = new Set<number>();

      for (let i = 0; i < 10; i++) {
        engine.resetBudget();
        results.add(engine.addLaplaceNoise(original));
      }

      // Should have variation due to noise
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('generateEligibilityProof', () => {
    it('should generate valid proof structure', () => {
      const proof = engine.generateEligibilityProof('credential-abc', 'root-123');

      expect(proof).toHaveProperty('proof');
      expect(proof).toHaveProperty('publicInput');
      expect(proof.publicInput).toBe('root-123');
      expect(proof.proof).toContain(':');
    });
  });

  describe('verifyEligibilityProof', () => {
    it('should verify matching roots', () => {
      const proof = engine.generateEligibilityProof('cred', 'expected-root');
      const isValid = engine.verifyEligibilityProof(proof.proof, proof.publicInput, 'expected-root');

      expect(isValid).toBe(true);
    });

    it('should reject mismatched roots', () => {
      const proof = engine.generateEligibilityProof('cred', 'root-a');
      const isValid = engine.verifyEligibilityProof(proof.proof, proof.publicInput, 'root-b');

      expect(isValid).toBe(false);
    });
  });

  describe('checkKAnonymity', () => {
    it('should detect k-anonymity satisfaction', () => {
      const data = [
        { age: '30', zip: '12345', name: 'A' },
        { age: '30', zip: '12345', name: 'B' },
        { age: '30', zip: '12345', name: 'C' },
      ];

      const result = engine.checkKAnonymity(data, ['age', 'zip'], 3);

      expect(result.satisfies).toBe(true);
      expect(result.minGroupSize).toBe(3);
    });

    it('should detect k-anonymity violation', () => {
      const data = [
        { age: '30', zip: '12345', name: 'A' },
        { age: '31', zip: '12345', name: 'B' },
      ];

      const result = engine.checkKAnonymity(data, ['age', 'zip'], 2);

      expect(result.satisfies).toBe(false);
      expect(result.minGroupSize).toBe(1);
    });
  });

  describe('getRemainingBudget', () => {
    it('should track budget usage', () => {
      const initial = engine.getRemainingBudget();
      engine.addLaplaceNoise(100);
      const after = engine.getRemainingBudget();

      expect(after).toBeLessThan(initial);
    });
  });
});

describe('HomomorphicTallying', () => {
  let tally: HomomorphicTallying;

  beforeEach(() => {
    tally = new HomomorphicTallying();
  });

  it('should encrypt and decrypt values', () => {
    const original = 42;
    const encrypted = tally.encrypt(original);
    const decrypted = tally.decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  it('should support homomorphic addition', () => {
    const e1 = tally.encrypt(10);
    const e2 = tally.encrypt(20);
    const sum = tally.addEncrypted(e1, e2);
    const result = tally.decryptSum(sum, 2); // 2 values were added

    expect(result).toBe(30);
  });
});
