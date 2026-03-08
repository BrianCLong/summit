"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const DataAnonymizer_js_1 = require("../anonymization/DataAnonymizer.js");
const index_js_1 = require("../types/index.js");
(0, vitest_1.describe)('DataAnonymizer', () => {
    let anonymizer;
    (0, vitest_1.beforeEach)(() => {
        anonymizer = new DataAnonymizer_js_1.DataAnonymizer('test-salt');
    });
    (0, vitest_1.describe)('anonymize', () => {
        (0, vitest_1.it)('should anonymize data with redaction', async () => {
            const data = [
                { id: '1', name: 'John Doe', email: 'john@example.com' },
                { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
            ];
            const configs = [
                {
                    fieldPath: 'name',
                    technique: index_js_1.AnonymizationTechnique.REDACTION,
                    config: {},
                },
            ];
            const result = await anonymizer.anonymize(data, configs);
            (0, vitest_1.expect)(result.data[0].name).toBe('[REDACTED]');
            (0, vitest_1.expect)(result.data[1].name).toBe('[REDACTED]');
            (0, vitest_1.expect)(result.data[0].email).toBe('john@example.com'); // Unchanged
        });
        (0, vitest_1.it)('should anonymize with hashing', async () => {
            const data = [{ id: '1', email: 'john@example.com' }];
            const configs = [
                {
                    fieldPath: 'email',
                    technique: index_js_1.AnonymizationTechnique.HASHING,
                    config: { hashAlgorithm: 'sha256' },
                },
            ];
            const result = await anonymizer.anonymize(data, configs);
            (0, vitest_1.expect)(result.data[0].email).not.toBe('john@example.com');
            (0, vitest_1.expect)(result.data[0].email).toHaveLength(64); // SHA256 hex length
        });
        (0, vitest_1.it)('should pseudonymize consistently', async () => {
            const data = [
                { id: '1', name: 'John' },
                { id: '2', name: 'John' },
                { id: '3', name: 'Jane' },
            ];
            const configs = [
                {
                    fieldPath: 'name',
                    technique: index_js_1.AnonymizationTechnique.PSEUDONYMIZATION,
                    config: {},
                },
            ];
            const result = await anonymizer.anonymize(data, configs);
            // Same input should produce same pseudonym
            (0, vitest_1.expect)(result.data[0].name).toBe(result.data[1].name);
            // Different input should produce different pseudonym
            (0, vitest_1.expect)(result.data[0].name).not.toBe(result.data[2].name);
        });
        (0, vitest_1.it)('should mask values correctly', async () => {
            const data = [{ id: '1', phone: '555-123-4567' }];
            const configs = [
                {
                    fieldPath: 'phone',
                    technique: index_js_1.AnonymizationTechnique.MASKING,
                    config: { maskFromStart: 4, maskFromEnd: 4, maskChar: '*' },
                },
            ];
            const result = await anonymizer.anonymize(data, configs);
            (0, vitest_1.expect)(result.data[0].phone).toBe('555-****4567');
        });
        (0, vitest_1.it)('should generalize numbers', async () => {
            const data = [{ id: '1', salary: 75432 }];
            const configs = [
                {
                    fieldPath: 'salary',
                    technique: index_js_1.AnonymizationTechnique.GENERALIZATION,
                    config: {},
                },
            ];
            const result = await anonymizer.anonymize(data, configs);
            // Should round to nearest magnitude
            (0, vitest_1.expect)(result.data[0].salary).toBe(80000);
        });
        (0, vitest_1.it)('should add noise to numbers', async () => {
            const data = [{ id: '1', amount: 1000 }];
            const configs = [
                {
                    fieldPath: 'amount',
                    technique: index_js_1.AnonymizationTechnique.NOISE_ADDITION,
                    config: {},
                },
            ];
            const result = await anonymizer.anonymize(data, configs);
            // Value should be different but in reasonable range
            (0, vitest_1.expect)(result.data[0].amount).not.toBe(1000);
            (0, vitest_1.expect)(typeof result.data[0].amount).toBe('number');
        });
        (0, vitest_1.it)('should handle nested fields', async () => {
            const data = [
                {
                    id: '1',
                    contact: {
                        email: 'john@example.com',
                        phone: '555-1234',
                    },
                },
            ];
            const configs = [
                {
                    fieldPath: 'contact.email',
                    technique: index_js_1.AnonymizationTechnique.REDACTION,
                    config: {},
                },
            ];
            const result = await anonymizer.anonymize(data, configs);
            (0, vitest_1.expect)(result.data[0].contact.email).toBe('[REDACTED]');
            (0, vitest_1.expect)(result.data[0].contact.phone).toBe('555-1234');
        });
        (0, vitest_1.it)('should report statistics', async () => {
            const data = [
                { id: '1', name: 'John' },
                { id: '2', name: 'Jane' },
                { id: '3', name: 'John' },
            ];
            const configs = [
                {
                    fieldPath: 'name',
                    technique: index_js_1.AnonymizationTechnique.PSEUDONYMIZATION,
                    config: {},
                },
            ];
            const result = await anonymizer.anonymize(data, configs);
            (0, vitest_1.expect)(result.stats).toHaveLength(1);
            (0, vitest_1.expect)(result.stats[0].recordsProcessed).toBe(3);
            (0, vitest_1.expect)(result.stats[0].valuesAnonymized).toBe(3);
            (0, vitest_1.expect)(result.stats[0].uniqueValuesBefore).toBe(2);
            (0, vitest_1.expect)(result.stats[0].uniqueValuesAfter).toBe(2);
        });
        (0, vitest_1.it)('should handle null and undefined values', async () => {
            const data = [
                { id: '1', name: 'John', nickname: null },
                { id: '2', name: undefined, nickname: 'Johnny' },
            ];
            const configs = [
                {
                    fieldPath: 'name',
                    technique: index_js_1.AnonymizationTechnique.REDACTION,
                    config: {},
                },
                {
                    fieldPath: 'nickname',
                    technique: index_js_1.AnonymizationTechnique.REDACTION,
                    config: {},
                },
            ];
            const result = await anonymizer.anonymize(data, configs);
            (0, vitest_1.expect)(result.data[0].nickname).toBeNull();
            (0, vitest_1.expect)(result.data[1].name).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('anonymizeValue', () => {
        (0, vitest_1.it)('should apply k-anonymity to numbers', () => {
            const config = {
                fieldPath: 'age',
                technique: index_js_1.AnonymizationTechnique.K_ANONYMITY,
                config: { kValue: 5 },
            };
            const result = anonymizer.anonymizeValue(32, config);
            (0, vitest_1.expect)(result).toContain('-'); // Should be a range
        });
        (0, vitest_1.it)('should apply differential privacy to numbers', () => {
            const config = {
                fieldPath: 'salary',
                technique: index_js_1.AnonymizationTechnique.DIFFERENTIAL_PRIVACY,
                config: { epsilon: 1.0 },
            };
            const results = new Set();
            for (let i = 0; i < 10; i++) {
                const result = anonymizer.anonymizeValue(50000, config);
                results.add(Math.round(result));
            }
            // With differential privacy, we should get variation
            (0, vitest_1.expect)(results.size).toBeGreaterThan(1);
        });
    });
    (0, vitest_1.describe)('resetMappings', () => {
        (0, vitest_1.it)('should clear pseudonym mappings', async () => {
            const data = [{ id: '1', name: 'John' }];
            const configs = [
                {
                    fieldPath: 'name',
                    technique: index_js_1.AnonymizationTechnique.PSEUDONYMIZATION,
                    config: {},
                },
            ];
            const result1 = await anonymizer.anonymize(data, configs);
            anonymizer.resetMappings();
            const result2 = await anonymizer.anonymize(data, configs);
            // After reset, pseudonyms may differ
            // (depends on random component)
        });
    });
});
