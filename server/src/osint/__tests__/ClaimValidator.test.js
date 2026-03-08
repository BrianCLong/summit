"use strict";
/**
 * ClaimValidator Service - Test Suite
 * Tests for Automation Turn #5: Source-Independent Validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ClaimValidator_js_1 = require("../ClaimValidator.js");
(0, globals_1.describe)('ClaimValidator', () => {
    let validator;
    (0, globals_1.beforeEach)(() => {
        validator = new ClaimValidator_js_1.ClaimValidator();
    });
    const createClaim = (overrides = {}) => ({
        id: `claim-${Math.random().toString(36).substr(2, 9)}`,
        sourceId: 'test-source',
        subject: 'test-subject',
        predicate: 'testPredicate',
        object: 'test-value',
        confidence: 0.8,
        timestamp: new Date().toISOString(),
        verificationHistory: [],
        ...overrides,
    });
    (0, globals_1.describe)('validate()', () => {
        (0, globals_1.it)('should return claims with updated verification history', async () => {
            const claims = [createClaim()];
            const validated = await validator.validate(claims);
            (0, globals_1.expect)(validated.length).toBe(1);
            (0, globals_1.expect)(validated[0].verificationHistory).toBeDefined();
        });
        (0, globals_1.it)('should preserve original claim properties', async () => {
            const originalClaim = createClaim({
                id: 'claim-original',
                subject: 'original-subject',
                predicate: 'originalPredicate',
                object: { key: 'value' },
            });
            const validated = await validator.validate([originalClaim]);
            (0, globals_1.expect)(validated[0].id).toBe('claim-original');
            (0, globals_1.expect)(validated[0].subject).toBe('original-subject');
            (0, globals_1.expect)(validated[0].predicate).toBe('originalPredicate');
            (0, globals_1.expect)(validated[0].object).toEqual({ key: 'value' });
        });
    });
    (0, globals_1.describe)('Corroboration Strategy', () => {
        (0, globals_1.it)('should increase confidence when multiple sources agree', async () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    sourceId: 'source-a',
                    subject: 'entity-1',
                    predicate: 'hasName',
                    object: 'John Doe',
                    confidence: 0.7,
                }),
                createClaim({
                    id: 'claim-2',
                    sourceId: 'source-b',
                    subject: 'entity-1',
                    predicate: 'hasName',
                    object: 'John Doe',
                    confidence: 0.7,
                }),
            ];
            const validated = await validator.validate(claims);
            // Both claims should have increased confidence due to corroboration
            (0, globals_1.expect)(validated[0].confidence).toBeGreaterThan(0.7);
            (0, globals_1.expect)(validated[1].confidence).toBeGreaterThan(0.7);
            // Check verification history
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'corroboration');
            (0, globals_1.expect)(verification?.status).toBe('confirmed');
            (0, globals_1.expect)(verification?.confidenceDelta).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should decrease confidence when sources conflict', async () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    sourceId: 'source-a',
                    subject: 'entity-1',
                    predicate: 'hasName',
                    object: 'John Doe',
                    confidence: 0.8,
                }),
                createClaim({
                    id: 'claim-2',
                    sourceId: 'source-b',
                    subject: 'entity-1',
                    predicate: 'hasName',
                    object: 'Jane Doe',
                    confidence: 0.8,
                }),
            ];
            const validated = await validator.validate(claims);
            // Claims should have decreased confidence due to conflict
            (0, globals_1.expect)(validated[0].confidence).toBeLessThan(0.8);
            (0, globals_1.expect)(validated[1].confidence).toBeLessThan(0.8);
            // Check verification history
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'corroboration');
            (0, globals_1.expect)(verification?.status).toBe('refuted');
        });
        (0, globals_1.it)('should mark as uncertain when no corroborating sources exist', async () => {
            const claims = [createClaim({ sourceId: 'sole-source' })];
            const validated = await validator.validate(claims);
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'corroboration');
            (0, globals_1.expect)(verification?.status).toBe('uncertain');
            (0, globals_1.expect)(verification?.confidenceDelta).toBe(0);
        });
    });
    (0, globals_1.describe)('Temporal Consistency Strategy', () => {
        (0, globals_1.it)('should confirm claims with valid temporal bounds', async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const claims = [
                createClaim({
                    validFrom: yesterday.toISOString(),
                    validTo: tomorrow.toISOString(),
                }),
            ];
            const validated = await validator.validate(claims);
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'temporal-consistency');
            (0, globals_1.expect)(verification?.status).toBe('confirmed');
        });
        (0, globals_1.it)('should mark claims as uncertain when expired', async () => {
            const past = new Date('2020-01-01');
            const pastEnd = new Date('2020-12-31');
            const claims = [
                createClaim({
                    validFrom: past.toISOString(),
                    validTo: pastEnd.toISOString(),
                }),
            ];
            const validated = await validator.validate(claims);
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'temporal-consistency');
            (0, globals_1.expect)(verification?.status).toBe('uncertain');
            (0, globals_1.expect)(verification?.confidenceDelta).toBeLessThan(0);
        });
        (0, globals_1.it)('should refute claims with invalid temporal range', async () => {
            const claims = [
                createClaim({
                    validFrom: '2026-12-31T00:00:00Z',
                    validTo: '2026-01-01T00:00:00Z', // validTo before validFrom
                }),
            ];
            const validated = await validator.validate(claims);
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'temporal-consistency');
            (0, globals_1.expect)(verification?.status).toBe('refuted');
            (0, globals_1.expect)(verification?.evidence).toContain('Invalid temporal range: validFrom > validTo');
        });
    });
    (0, globals_1.describe)('Semantic Plausibility Strategy', () => {
        (0, globals_1.it)('should confirm valid follower counts', async () => {
            const claims = [
                createClaim({
                    predicate: 'hasFollowerCount',
                    object: 50000,
                }),
            ];
            const validated = await validator.validate(claims);
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'semantic-plausibility');
            (0, globals_1.expect)(verification?.status).toBe('confirmed');
        });
        (0, globals_1.it)('should refute implausible follower counts', async () => {
            const claims = [
                createClaim({
                    predicate: 'hasFollowerCount',
                    object: -100, // Negative followers
                }),
            ];
            const validated = await validator.validate(claims);
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'semantic-plausibility');
            (0, globals_1.expect)(verification?.status).toBe('refuted');
            (0, globals_1.expect)(verification?.confidenceDelta).toBeLessThan(0);
        });
        (0, globals_1.it)('should refute billion+ follower counts', async () => {
            const claims = [
                createClaim({
                    predicate: 'hasFollowerCount',
                    object: 2000000000, // 2 billion - implausible
                }),
            ];
            const validated = await validator.validate(claims);
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'semantic-plausibility');
            (0, globals_1.expect)(verification?.status).toBe('refuted');
        });
        (0, globals_1.it)('should confirm valid status values', async () => {
            const claims = [
                createClaim({
                    predicate: 'hasStatus',
                    object: 'active',
                }),
            ];
            const validated = await validator.validate(claims);
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'semantic-plausibility');
            (0, globals_1.expect)(verification?.status).toBe('confirmed');
        });
        (0, globals_1.it)('should refute invalid status values', async () => {
            const claims = [
                createClaim({
                    predicate: 'hasStatus',
                    object: 'unknown-status',
                }),
            ];
            const validated = await validator.validate(claims);
            const verification = validated[0].verificationHistory?.find(v => v.verifierId === 'semantic-plausibility');
            (0, globals_1.expect)(verification?.status).toBe('refuted');
        });
    });
    (0, globals_1.describe)('Confidence Bounds', () => {
        (0, globals_1.it)('should not exceed confidence of 1.0', async () => {
            // Create many corroborating claims
            const claims = Array.from({ length: 20 }, (_, i) => createClaim({
                id: `claim-${i}`,
                sourceId: `source-${i}`,
                subject: 'entity-1',
                predicate: 'hasName',
                object: 'John Doe',
                confidence: 0.95,
            }));
            const validated = await validator.validate(claims);
            for (const claim of validated) {
                (0, globals_1.expect)(claim.confidence).toBeLessThanOrEqual(1.0);
            }
        });
        (0, globals_1.it)('should not go below confidence of 0.0', async () => {
            // Create conflicting claims with low initial confidence
            const claims = Array.from({ length: 10 }, (_, i) => createClaim({
                id: `claim-${i}`,
                sourceId: `source-${i}`,
                subject: 'entity-1',
                predicate: 'hasName',
                object: `Name-${i}`, // All different values
                confidence: 0.1,
            }));
            const validated = await validator.validate(claims);
            for (const claim of validated) {
                (0, globals_1.expect)(claim.confidence).toBeGreaterThanOrEqual(0.0);
            }
        });
    });
    (0, globals_1.describe)('Custom Strategy Registration', () => {
        (0, globals_1.it)('should allow registering custom validation strategies', async () => {
            const customStrategy = {
                id: 'custom-strategy',
                name: 'Custom Test Strategy',
                canValidate: () => true,
                validate: async () => ({
                    verifierId: 'custom-strategy',
                    timestamp: new Date().toISOString(),
                    status: 'confirmed',
                    confidenceDelta: 0.05,
                    evidence: ['Custom validation passed'],
                }),
            };
            validator.registerStrategy(customStrategy);
            const claims = [createClaim()];
            const validated = await validator.validate(claims);
            const customVerification = validated[0].verificationHistory?.find(v => v.verifierId === 'custom-strategy');
            (0, globals_1.expect)(customVerification).toBeDefined();
            (0, globals_1.expect)(customVerification?.status).toBe('confirmed');
        });
    });
});
