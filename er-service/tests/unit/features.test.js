"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const features_1 = require("../../src/core/features");
(0, globals_1.describe)('Feature Extraction', () => {
    (0, globals_1.describe)('tokenize', () => {
        (0, globals_1.it)('should tokenize text correctly', () => {
            (0, globals_1.expect)((0, features_1.tokenize)('John Michael Smith')).toEqual(['john', 'michael', 'smith']);
            (0, globals_1.expect)((0, features_1.tokenize)('ACME Corp.')).toEqual(['acme', 'corp']);
            (0, globals_1.expect)((0, features_1.tokenize)('test-123')).toEqual(['test', '123']);
        });
        (0, globals_1.it)('should handle empty strings', () => {
            (0, globals_1.expect)((0, features_1.tokenize)('')).toEqual([]);
        });
    });
    (0, globals_1.describe)('jaccardSimilarity', () => {
        (0, globals_1.it)('should calculate Jaccard similarity correctly', () => {
            const a = ['john', 'smith'];
            const b = ['john', 'smith'];
            (0, globals_1.expect)((0, features_1.jaccardSimilarity)(a, b)).toBe(1);
        });
        (0, globals_1.it)('should handle partial overlap', () => {
            const a = ['john', 'michael', 'smith'];
            const b = ['john', 'smith', 'jr'];
            const similarity = (0, features_1.jaccardSimilarity)(a, b);
            (0, globals_1.expect)(similarity).toBeCloseTo(0.5, 1); // 2 common / 4 total
        });
        (0, globals_1.it)('should return 0 for no overlap', () => {
            const a = ['john', 'smith'];
            const b = ['jane', 'doe'];
            (0, globals_1.expect)((0, features_1.jaccardSimilarity)(a, b)).toBe(0);
        });
    });
    (0, globals_1.describe)('normalizedLevenshtein', () => {
        (0, globals_1.it)('should return 1 for identical strings', () => {
            (0, globals_1.expect)((0, features_1.normalizedLevenshtein)('john', 'john')).toBe(1);
        });
        (0, globals_1.it)('should calculate distance for similar strings', () => {
            const similarity = (0, features_1.normalizedLevenshtein)('john', 'jon');
            (0, globals_1.expect)(similarity).toBeGreaterThan(0.7);
        });
        (0, globals_1.it)('should calculate distance for different strings', () => {
            const similarity = (0, features_1.normalizedLevenshtein)('john', 'jane');
            (0, globals_1.expect)(similarity).toBeLessThan(0.5);
        });
    });
    (0, globals_1.describe)('phoneticSignature', () => {
        (0, globals_1.it)('should generate phonetic signature', () => {
            (0, globals_1.expect)((0, features_1.phoneticSignature)('Smith')).toBe('ssmt');
            (0, globals_1.expect)((0, features_1.phoneticSignature)('Smyth')).toBe('ssmy');
        });
        (0, globals_1.it)('should handle empty strings', () => {
            (0, globals_1.expect)((0, features_1.phoneticSignature)('')).toBe('');
        });
    });
    (0, globals_1.describe)('extractFeatures', () => {
        const entityA = {
            id: 'e1',
            type: 'person',
            name: 'John Smith',
            tenantId: 'test',
            attributes: { email: 'john@example.com', age: 30 },
            deviceIds: ['device-1', 'device-2'],
            accountIds: ['acct-1'],
        };
        const entityB = {
            id: 'e2',
            type: 'person',
            name: 'Jon Smith',
            tenantId: 'test',
            attributes: { email: 'john@example.com', age: 30 },
            deviceIds: ['device-1'],
            accountIds: ['acct-1'],
        };
        (0, globals_1.it)('should extract all features', () => {
            const features = (0, features_1.extractFeatures)(entityA, entityB);
            (0, globals_1.expect)(features.nameSimilarity).toBeGreaterThan(0.8);
            (0, globals_1.expect)(features.typeMatch).toBe(true);
            (0, globals_1.expect)(features.semanticSimilarity).toBeGreaterThan(0);
            (0, globals_1.expect)(features.deviceIdMatch).toBeGreaterThan(0);
            (0, globals_1.expect)(features.accountIdMatch).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should detect type mismatch', () => {
            const entityC = { ...entityB, type: 'organization' };
            const features = (0, features_1.extractFeatures)(entityA, entityC);
            (0, globals_1.expect)(features.typeMatch).toBe(false);
        });
        (0, globals_1.it)('should calculate device ID overlap', () => {
            const features = (0, features_1.extractFeatures)(entityA, entityB);
            (0, globals_1.expect)(features.deviceIdMatch).toBeGreaterThan(0.3); // Jaccard: 1/3
        });
    });
});
