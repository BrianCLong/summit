"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const scorer_1 = require("../../src/scoring/scorer");
const types_1 = require("../../src/types");
(0, globals_1.describe)('Scoring System', () => {
    const entityA = {
        id: 'e1',
        type: 'person',
        name: 'John Smith',
        tenantId: 'test',
        attributes: { email: 'john@example.com' },
        deviceIds: ['device-1'],
    };
    const entityB = {
        id: 'e2',
        type: 'person',
        name: 'Jon Smith',
        tenantId: 'test',
        attributes: { email: 'john@example.com' },
        deviceIds: ['device-1'],
    };
    (0, globals_1.describe)('DeterministicScorer', () => {
        (0, globals_1.it)('should score similar entities highly', () => {
            const scorer = new scorer_1.DeterministicScorer(types_1.DEFAULT_SCORING_CONFIG);
            const result = scorer.score(entityA, entityB);
            (0, globals_1.expect)(result.score).toBeGreaterThan(0.5);
            (0, globals_1.expect)(result.entityId).toBe('e2');
            (0, globals_1.expect)(result.method).toBe('deterministic');
            (0, globals_1.expect)(result.rationale).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.rationale.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should score different entities lowly', () => {
            const entityC = {
                ...entityB,
                name: 'Jane Doe',
                attributes: { email: 'jane@example.com' },
                deviceIds: ['device-2'],
            };
            const scorer = new scorer_1.DeterministicScorer(types_1.DEFAULT_SCORING_CONFIG);
            const result = scorer.score(entityA, entityC);
            (0, globals_1.expect)(result.score).toBeLessThan(0.5);
        });
    });
    (0, globals_1.describe)('ProbabilisticScorer', () => {
        (0, globals_1.it)('should provide confidence estimates', () => {
            const scorer = new scorer_1.ProbabilisticScorer(types_1.DEFAULT_SCORING_CONFIG);
            const result = scorer.score(entityA, entityB);
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0);
            (0, globals_1.expect)(result.confidence).toBeLessThanOrEqual(1);
            (0, globals_1.expect)(result.method).toBe('probabilistic');
        });
        (0, globals_1.it)('should have higher confidence with more signals', () => {
            const entityWithMoreSignals = {
                ...entityB,
                locations: [{ lat: 40.7128, lon: -74.0060 }],
                timestamps: ['2024-01-15T10:00:00Z'],
            };
            const entityAWithSignals = {
                ...entityA,
                locations: [{ lat: 40.7128, lon: -74.0060 }],
                timestamps: ['2024-01-15T10:00:00Z'],
            };
            const scorer = new scorer_1.ProbabilisticScorer(types_1.DEFAULT_SCORING_CONFIG);
            const result1 = scorer.score(entityA, entityB);
            const result2 = scorer.score(entityAWithSignals, entityWithMoreSignals);
            (0, globals_1.expect)(result2.confidence).toBeGreaterThanOrEqual(result1.confidence);
        });
    });
    (0, globals_1.describe)('HybridScorer', () => {
        (0, globals_1.it)('should combine deterministic and probabilistic approaches', () => {
            const scorer = new scorer_1.HybridScorer(types_1.DEFAULT_SCORING_CONFIG);
            const result = scorer.score(entityA, entityB);
            (0, globals_1.expect)(result.method).toBe('hybrid');
            (0, globals_1.expect)(result.score).toBeGreaterThan(0);
            (0, globals_1.expect)(result.confidence).toBeGreaterThan(0);
            (0, globals_1.expect)(result.rationale.some(r => r.includes('Hybrid score'))).toBe(true);
        });
    });
    (0, globals_1.describe)('createScorer', () => {
        (0, globals_1.it)('should create deterministic scorer', () => {
            const config = { ...types_1.DEFAULT_SCORING_CONFIG, method: 'deterministic' };
            const scorer = (0, scorer_1.createScorer)(config);
            (0, globals_1.expect)(scorer.getMethod()).toBe('deterministic');
        });
        (0, globals_1.it)('should create probabilistic scorer', () => {
            const config = { ...types_1.DEFAULT_SCORING_CONFIG, method: 'probabilistic' };
            const scorer = (0, scorer_1.createScorer)(config);
            (0, globals_1.expect)(scorer.getMethod()).toBe('probabilistic');
        });
        (0, globals_1.it)('should create hybrid scorer', () => {
            const config = { ...types_1.DEFAULT_SCORING_CONFIG, method: 'hybrid' };
            const scorer = (0, scorer_1.createScorer)(config);
            (0, globals_1.expect)(scorer.getMethod()).toBe('hybrid');
        });
    });
});
