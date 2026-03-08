"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const differential_privacy_js_1 = require("../src/privacy/differential-privacy.js");
(0, vitest_1.describe)('DifferentialPrivacyEngine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new differential_privacy_js_1.DifferentialPrivacyEngine({ epsilon: 1.0, delta: 1e-5, sensitivity: 1 });
    });
    (0, vitest_1.describe)('anonymizeVoter', () => {
        (0, vitest_1.it)('should generate consistent anonymous IDs for same voter/salt', () => {
            const result1 = engine.anonymizeVoter('voter-123', 'jurisdiction-A', 'salt-xyz');
            const result2 = engine.anonymizeVoter('voter-123', 'jurisdiction-A', 'salt-xyz');
            (0, vitest_1.expect)(result1.anonymousId).toBe(result2.anonymousId);
            (0, vitest_1.expect)(result1.participationToken).toBe(result2.participationToken);
        });
        (0, vitest_1.it)('should generate different IDs for different voters', () => {
            const result1 = engine.anonymizeVoter('voter-123', 'jurisdiction-A', 'salt-xyz');
            const result2 = engine.anonymizeVoter('voter-456', 'jurisdiction-A', 'salt-xyz');
            (0, vitest_1.expect)(result1.anonymousId).not.toBe(result2.anonymousId);
        });
        (0, vitest_1.it)('should include all required fields', () => {
            const result = engine.anonymizeVoter('voter-1', 'jur-1', 'salt');
            (0, vitest_1.expect)(result).toHaveProperty('anonymousId');
            (0, vitest_1.expect)(result).toHaveProperty('jurisdictionHash');
            (0, vitest_1.expect)(result).toHaveProperty('participationToken');
            (0, vitest_1.expect)(result).toHaveProperty('timestamp');
        });
    });
    (0, vitest_1.describe)('addLaplaceNoise', () => {
        (0, vitest_1.it)('should add noise to values', () => {
            const original = 1000;
            const results = new Set();
            for (let i = 0; i < 10; i++) {
                engine.resetBudget();
                results.add(engine.addLaplaceNoise(original));
            }
            // Should have variation due to noise
            (0, vitest_1.expect)(results.size).toBeGreaterThan(1);
        });
    });
    (0, vitest_1.describe)('generateEligibilityProof', () => {
        (0, vitest_1.it)('should generate valid proof structure', () => {
            const proof = engine.generateEligibilityProof('credential-abc', 'root-123');
            (0, vitest_1.expect)(proof).toHaveProperty('proof');
            (0, vitest_1.expect)(proof).toHaveProperty('publicInput');
            (0, vitest_1.expect)(proof.publicInput).toBe('root-123');
            (0, vitest_1.expect)(proof.proof).toContain(':');
        });
    });
    (0, vitest_1.describe)('verifyEligibilityProof', () => {
        (0, vitest_1.it)('should verify matching roots', () => {
            const proof = engine.generateEligibilityProof('cred', 'expected-root');
            const isValid = engine.verifyEligibilityProof(proof.proof, proof.publicInput, 'expected-root');
            (0, vitest_1.expect)(isValid).toBe(true);
        });
        (0, vitest_1.it)('should reject mismatched roots', () => {
            const proof = engine.generateEligibilityProof('cred', 'root-a');
            const isValid = engine.verifyEligibilityProof(proof.proof, proof.publicInput, 'root-b');
            (0, vitest_1.expect)(isValid).toBe(false);
        });
    });
    (0, vitest_1.describe)('checkKAnonymity', () => {
        (0, vitest_1.it)('should detect k-anonymity satisfaction', () => {
            const data = [
                { age: '30', zip: '12345', name: 'A' },
                { age: '30', zip: '12345', name: 'B' },
                { age: '30', zip: '12345', name: 'C' },
            ];
            const result = engine.checkKAnonymity(data, ['age', 'zip'], 3);
            (0, vitest_1.expect)(result.satisfies).toBe(true);
            (0, vitest_1.expect)(result.minGroupSize).toBe(3);
        });
        (0, vitest_1.it)('should detect k-anonymity violation', () => {
            const data = [
                { age: '30', zip: '12345', name: 'A' },
                { age: '31', zip: '12345', name: 'B' },
            ];
            const result = engine.checkKAnonymity(data, ['age', 'zip'], 2);
            (0, vitest_1.expect)(result.satisfies).toBe(false);
            (0, vitest_1.expect)(result.minGroupSize).toBe(1);
        });
    });
    (0, vitest_1.describe)('getRemainingBudget', () => {
        (0, vitest_1.it)('should track budget usage', () => {
            const initial = engine.getRemainingBudget();
            engine.addLaplaceNoise(100);
            const after = engine.getRemainingBudget();
            (0, vitest_1.expect)(after).toBeLessThan(initial);
        });
    });
});
(0, vitest_1.describe)('HomomorphicTallying', () => {
    let tally;
    (0, vitest_1.beforeEach)(() => {
        tally = new differential_privacy_js_1.HomomorphicTallying();
    });
    (0, vitest_1.it)('should encrypt and decrypt values', () => {
        const original = 42;
        const encrypted = tally.encrypt(original);
        const decrypted = tally.decrypt(encrypted);
        (0, vitest_1.expect)(decrypted).toBe(original);
    });
    (0, vitest_1.it)('should support homomorphic addition', () => {
        const e1 = tally.encrypt(10);
        const e2 = tally.encrypt(20);
        const sum = tally.addEncrypted(e1, e2);
        const result = tally.decryptSum(sum, 2); // 2 values were added
        (0, vitest_1.expect)(result).toBe(30);
    });
});
