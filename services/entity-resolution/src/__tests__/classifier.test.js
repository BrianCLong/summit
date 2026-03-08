"use strict";
/**
 * Entity Resolution Service - Classifier Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const classifier_js_1 = require("../matching/classifier.js");
(0, globals_1.describe)('Classifier', () => {
    (0, globals_1.describe)('scoreMatch', () => {
        (0, globals_1.it)('should return high score for exact match features', () => {
            const features = {
                nameSimilarity: 1.0,
                emailSimilarity: 1.0,
                orgSimilarity: 1.0,
                temporalOverlapScore: 1.0,
                sharedIdentifiersCount: 2,
            };
            const { score, contributions } = (0, classifier_js_1.scoreMatch)(features, classifier_js_1.DEFAULT_CONFIG);
            (0, globals_1.expect)(score).toBeGreaterThan(0.9);
            (0, globals_1.expect)(contributions).toBeDefined();
            (0, globals_1.expect)(contributions.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should return low score for no match features', () => {
            const features = {
                nameSimilarity: 0.0,
                emailSimilarity: 0.0,
                orgSimilarity: 0.0,
                temporalOverlapScore: 0.0,
                sharedIdentifiersCount: 0,
            };
            const { score } = (0, classifier_js_1.scoreMatch)(features, classifier_js_1.DEFAULT_CONFIG);
            (0, globals_1.expect)(score).toBeLessThan(0.2);
        });
        (0, globals_1.it)('should handle missing features gracefully', () => {
            const features = {
                nameSimilarity: 0.9,
                // Other features missing
            };
            const { score, contributions } = (0, classifier_js_1.scoreMatch)(features, classifier_js_1.DEFAULT_CONFIG);
            (0, globals_1.expect)(score).toBeGreaterThan(0);
            (0, globals_1.expect)(contributions).toBeDefined();
            (0, globals_1.expect)(contributions.some((c) => c.value === null)).toBe(true);
        });
        (0, globals_1.it)('should provide explainability with rationales', () => {
            const features = {
                nameSimilarity: 0.95,
                emailSimilarity: 1.0,
            };
            const { contributions } = (0, classifier_js_1.scoreMatch)(features, classifier_js_1.DEFAULT_CONFIG);
            const nameContrib = contributions.find((c) => c.feature === 'nameSimilarity');
            (0, globals_1.expect)(nameContrib).toBeDefined();
            (0, globals_1.expect)(nameContrib?.rationale).toContain('match');
            (0, globals_1.expect)(typeof nameContrib?.contribution).toBe('number');
        });
    });
    (0, globals_1.describe)('decideMatch', () => {
        const recordA = {
            id: 'A1',
            entityType: 'Person',
            attributes: {
                name: 'John Smith',
                email: 'john.smith@example.com',
            },
        };
        const recordB = {
            id: 'B1',
            entityType: 'Person',
            attributes: {
                name: 'John Smith',
                email: 'john.smith@example.com',
            },
        };
        (0, globals_1.it)('should recommend MERGE for clear matches', () => {
            const decision = (0, classifier_js_1.decideMatch)(recordA, recordB, classifier_js_1.DEFAULT_CONFIG);
            (0, globals_1.expect)(decision.outcome).toBe('MERGE');
            (0, globals_1.expect)(decision.matchScore).toBeGreaterThan(classifier_js_1.DEFAULT_CONFIG.mergeThreshold);
            (0, globals_1.expect)(decision.explanation.summary).toBeDefined();
            (0, globals_1.expect)(decision.explanation.featureContributions).toBeDefined();
        });
        (0, globals_1.it)('should recommend NO_MATCH for clear non-matches', () => {
            const recordC = {
                id: 'C1',
                entityType: 'Person',
                attributes: {
                    name: 'Jane Doe',
                    email: 'jane.doe@different.com',
                },
            };
            const decision = (0, classifier_js_1.decideMatch)(recordA, recordC, classifier_js_1.DEFAULT_CONFIG);
            (0, globals_1.expect)(decision.outcome).toBe('NO_MATCH');
            (0, globals_1.expect)(decision.matchScore).toBeLessThan(classifier_js_1.DEFAULT_CONFIG.reviewThreshold);
        });
        (0, globals_1.it)('should recommend REVIEW for ambiguous cases', () => {
            const recordD = {
                id: 'D1',
                entityType: 'Person',
                attributes: {
                    name: 'John Smith', // Same name
                    email: 'j.smith@different.com', // Different email
                },
            };
            const decision = (0, classifier_js_1.decideMatch)(recordA, recordD, classifier_js_1.DEFAULT_CONFIG);
            (0, globals_1.expect)(decision.outcome).toBe('REVIEW');
            (0, globals_1.expect)(decision.matchScore).toBeGreaterThan(classifier_js_1.DEFAULT_CONFIG.reviewThreshold);
            (0, globals_1.expect)(decision.matchScore).toBeLessThan(classifier_js_1.DEFAULT_CONFIG.mergeThreshold);
        });
        (0, globals_1.it)('should include explanation summary', () => {
            const decision = (0, classifier_js_1.decideMatch)(recordA, recordB, classifier_js_1.DEFAULT_CONFIG);
            (0, globals_1.expect)(decision.explanation.summary).toBeTruthy();
            (0, globals_1.expect)(decision.explanation.summary).toContain('MERGE');
        });
        (0, globals_1.it)('should set decidedBy field', () => {
            const decision = (0, classifier_js_1.decideMatch)(recordA, recordB, classifier_js_1.DEFAULT_CONFIG, 'user-123');
            (0, globals_1.expect)(decision.decidedBy).toBe('user-123');
        });
        (0, globals_1.it)('should set decidedAt timestamp', () => {
            const decision = (0, classifier_js_1.decideMatch)(recordA, recordB, classifier_js_1.DEFAULT_CONFIG);
            (0, globals_1.expect)(decision.decidedAt).toBeDefined();
            (0, globals_1.expect)(new Date(decision.decidedAt).getTime()).toBeLessThanOrEqual(Date.now());
        });
    });
});
