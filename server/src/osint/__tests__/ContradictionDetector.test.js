"use strict";
/**
 * ContradictionDetector Service - Test Suite
 * Tests for Automation Turn #5: Contradiction Detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ContradictionDetector_js_1 = require("../ContradictionDetector.js");
(0, globals_1.describe)('ContradictionDetector', () => {
    let detector;
    (0, globals_1.beforeEach)(() => {
        detector = new ContradictionDetector_js_1.ContradictionDetector();
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
    (0, globals_1.describe)('detect()', () => {
        (0, globals_1.it)('should return empty array for empty input', () => {
            const contradictions = detector.detect([]);
            (0, globals_1.expect)(contradictions).toEqual([]);
        });
        (0, globals_1.it)('should return empty array for single claim', () => {
            const claims = [createClaim()];
            const contradictions = detector.detect(claims);
            (0, globals_1.expect)(contradictions).toEqual([]);
        });
        (0, globals_1.it)('should not detect contradictions for claims about different subjects', () => {
            const claims = [
                createClaim({ subject: 'entity-1', object: 'value-1' }),
                createClaim({ subject: 'entity-2', object: 'value-2' }),
            ];
            const contradictions = detector.detect(claims);
            (0, globals_1.expect)(contradictions).toEqual([]);
        });
        (0, globals_1.it)('should not detect contradictions for claims with different predicates', () => {
            const claims = [
                createClaim({ subject: 'entity-1', predicate: 'hasName', object: 'John' }),
                createClaim({ subject: 'entity-1', predicate: 'hasEmail', object: 'john@example.com' }),
            ];
            const contradictions = detector.detect(claims);
            (0, globals_1.expect)(contradictions).toEqual([]);
        });
        (0, globals_1.it)('should not detect contradictions for matching values', () => {
            const claims = [
                createClaim({ id: 'c1', subject: 'entity-1', predicate: 'hasName', object: 'John' }),
                createClaim({ id: 'c2', subject: 'entity-1', predicate: 'hasName', object: 'John' }),
            ];
            const contradictions = detector.detect(claims);
            (0, globals_1.expect)(contradictions).toEqual([]);
        });
    });
    (0, globals_1.describe)('Temporal Overlap Rule', () => {
        (0, globals_1.it)('should detect contradictions for temporally overlapping claims with different values', () => {
            // Use a predicate that doesn't trigger MutualExclusionRule to test TemporalOverlapRule in isolation
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'company-1',
                    predicate: 'hasLocation',
                    object: 'London',
                    validFrom: '2025-01-01',
                    validTo: '2025-12-31',
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'company-1',
                    predicate: 'hasLocation',
                    object: 'Paris',
                    validFrom: '2025-06-01',
                    validTo: '2025-12-31',
                }),
            ];
            const contradictions = detector.detect(claims);
            (0, globals_1.expect)(contradictions.length).toBe(1);
            (0, globals_1.expect)(contradictions[0].claimIdA).toBe('claim-1');
            (0, globals_1.expect)(contradictions[0].claimIdB).toBe('claim-2');
            (0, globals_1.expect)(contradictions[0].reason).toContain('Temporal Overlap');
            (0, globals_1.expect)(contradictions[0].severity).toBe('high');
        });
        (0, globals_1.it)('should not detect contradictions for non-overlapping time periods', () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'active',
                    validFrom: '2020-01-01',
                    validTo: '2020-12-31',
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'dissolved',
                    validFrom: '2021-01-01',
                    validTo: '2021-12-31',
                }),
            ];
            const contradictions = detector.detect(claims);
            (0, globals_1.expect)(contradictions.length).toBe(0);
        });
    });
    (0, globals_1.describe)('Mutual Exclusion Rule', () => {
        (0, globals_1.it)('should detect contradictions for mutually exclusive status values', () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'active',
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'dissolved',
                }),
            ];
            const contradictions = detector.detect(claims);
            (0, globals_1.expect)(contradictions.length).toBeGreaterThan(0);
            const mutualExclusion = contradictions.find(c => c.reason.includes('Mutual Exclusion'));
            (0, globals_1.expect)(mutualExclusion).toBeDefined();
            (0, globals_1.expect)(mutualExclusion?.severity).toBe('high');
        });
        (0, globals_1.it)('should detect active vs inactive exclusion', () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'active',
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'inactive',
                }),
            ];
            const contradictions = detector.detect(claims);
            const mutualExclusion = contradictions.find(c => c.reason.includes('Mutual Exclusion'));
            (0, globals_1.expect)(mutualExclusion).toBeDefined();
        });
    });
    (0, globals_1.describe)('Numeric Range Rule', () => {
        (0, globals_1.it)('should detect significant numeric discrepancies', () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'user-1',
                    predicate: 'hasFollowerCount',
                    object: 10000,
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'user-1',
                    predicate: 'hasFollowerCount',
                    object: 50000, // 400% difference
                }),
            ];
            const contradictions = detector.detect(claims);
            const numericRule = contradictions.find(c => c.reason.includes('Numeric Discrepancy'));
            (0, globals_1.expect)(numericRule).toBeDefined();
        });
        (0, globals_1.it)('should not detect contradictions within tolerance', () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'user-1',
                    predicate: 'hasFollowerCount',
                    object: 10000,
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'user-1',
                    predicate: 'hasFollowerCount',
                    object: 10500, // 5% difference, within 10% tolerance
                }),
            ];
            const contradictions = detector.detect(claims);
            const numericRule = contradictions.find(c => c.reason.includes('Numeric Discrepancy'));
            (0, globals_1.expect)(numericRule).toBeUndefined();
        });
    });
    (0, globals_1.describe)('Status Transition Rule', () => {
        (0, globals_1.it)('should detect invalid status transitions', () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'dissolved',
                    validFrom: '2024-01-01',
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'active', // Cannot transition from dissolved to active
                    validFrom: '2025-01-01',
                }),
            ];
            const contradictions = detector.detect(claims);
            const transitionRule = contradictions.find(c => c.reason.includes('Invalid Status Transition'));
            (0, globals_1.expect)(transitionRule).toBeDefined();
            (0, globals_1.expect)(transitionRule?.severity).toBe('high');
        });
        (0, globals_1.it)('should allow valid status transitions', () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'active',
                    validFrom: '2024-01-01',
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'company-1',
                    predicate: 'hasStatus',
                    object: 'inactive',
                    validFrom: '2025-01-01',
                }),
            ];
            const contradictions = detector.detect(claims);
            const transitionRule = contradictions.find(c => c.reason.includes('Invalid Status Transition'));
            (0, globals_1.expect)(transitionRule).toBeUndefined();
        });
    });
    (0, globals_1.describe)('detectForClaim()', () => {
        (0, globals_1.it)('should detect contradictions between new claim and existing claims', () => {
            const existingClaims = [
                createClaim({
                    id: 'existing-1',
                    subject: 'entity-1',
                    predicate: 'hasStatus',
                    object: 'active',
                }),
            ];
            const newClaim = createClaim({
                id: 'new-1',
                subject: 'entity-1',
                predicate: 'hasStatus',
                object: 'dissolved',
            });
            const contradictions = detector.detectForClaim(newClaim, existingClaims);
            (0, globals_1.expect)(contradictions.length).toBeGreaterThan(0);
            (0, globals_1.expect)(contradictions[0].claimIdA).toBe('new-1');
            (0, globals_1.expect)(contradictions[0].claimIdB).toBe('existing-1');
        });
        (0, globals_1.it)('should skip self-comparison', () => {
            const claim = createClaim({ id: 'same-claim' });
            const contradictions = detector.detectForClaim(claim, [claim]);
            (0, globals_1.expect)(contradictions).toEqual([]);
        });
    });
    (0, globals_1.describe)('Contradiction Structure', () => {
        (0, globals_1.it)('should include all required contradiction fields', () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'entity-1',
                    predicate: 'hasStatus',
                    object: 'active',
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'entity-1',
                    predicate: 'hasStatus',
                    object: 'dissolved',
                }),
            ];
            const contradictions = detector.detect(claims);
            (0, globals_1.expect)(contradictions.length).toBeGreaterThan(0);
            for (const contradiction of contradictions) {
                (0, globals_1.expect)(contradiction.id).toBeDefined();
                (0, globals_1.expect)(contradiction.id.startsWith('contradiction-')).toBe(true);
                (0, globals_1.expect)(contradiction.claimIdA).toBeDefined();
                (0, globals_1.expect)(contradiction.claimIdB).toBeDefined();
                (0, globals_1.expect)(contradiction.reason).toBeDefined();
                (0, globals_1.expect)(contradiction.detectedAt).toBeDefined();
                (0, globals_1.expect)(['low', 'medium', 'high']).toContain(contradiction.severity);
            }
        });
        (0, globals_1.it)('should generate consistent IDs for same claim pair', () => {
            const claims = [
                createClaim({
                    id: 'claim-a',
                    subject: 'entity-1',
                    predicate: 'hasStatus',
                    object: 'active',
                }),
                createClaim({
                    id: 'claim-b',
                    subject: 'entity-1',
                    predicate: 'hasStatus',
                    object: 'dissolved',
                }),
            ];
            const contradictions1 = detector.detect(claims);
            const contradictions2 = detector.detect([...claims].reverse());
            // Same pair should generate same contradiction IDs
            const ids1 = new Set(contradictions1.map(c => c.id));
            const ids2 = new Set(contradictions2.map(c => c.id));
            (0, globals_1.expect)(ids1).toEqual(ids2);
        });
    });
    (0, globals_1.describe)('Custom Rule Registration', () => {
        (0, globals_1.it)('should allow registering custom contradiction rules', () => {
            const customRule = {
                id: 'custom-rule',
                name: 'Custom Test Rule',
                detect: (claimA, claimB) => {
                    if (claimA.predicate === 'customTest' && claimA.object !== claimB.object) {
                        return { reason: 'Custom contradiction detected', severity: 'medium' };
                    }
                    return null;
                },
            };
            detector.registerRule(customRule);
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'entity-1',
                    predicate: 'customTest',
                    object: 'value-a',
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'entity-1',
                    predicate: 'customTest',
                    object: 'value-b',
                }),
            ];
            const contradictions = detector.detect(claims);
            const customContradiction = contradictions.find(c => c.reason.includes('Custom Test Rule'));
            (0, globals_1.expect)(customContradiction).toBeDefined();
            (0, globals_1.expect)(customContradiction?.severity).toBe('medium');
        });
    });
    (0, globals_1.describe)('Deduplication', () => {
        (0, globals_1.it)('should not produce duplicate contradictions', () => {
            const claims = [
                createClaim({
                    id: 'claim-1',
                    subject: 'entity-1',
                    predicate: 'hasStatus',
                    object: 'active',
                    validFrom: '2025-01-01',
                    validTo: '2025-12-31',
                }),
                createClaim({
                    id: 'claim-2',
                    subject: 'entity-1',
                    predicate: 'hasStatus',
                    object: 'dissolved',
                    validFrom: '2025-06-01',
                    validTo: '2025-12-31',
                }),
            ];
            const contradictions = detector.detect(claims);
            const ids = contradictions.map(c => c.id);
            const uniqueIds = new Set(ids);
            (0, globals_1.expect)(ids.length).toBe(uniqueIds.size);
        });
    });
});
