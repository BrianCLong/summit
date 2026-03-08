"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const FusionEngine_js_1 = require("../fusion/FusionEngine.js");
(0, vitest_1.describe)('FusionEngine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new FusionEngine_js_1.FusionEngine({
            defaultStrategy: 'fuzzy_match',
            similarityThreshold: 0.8,
            conflictResolution: 'most_complete',
            enableDeduplication: true,
        });
    });
    (0, vitest_1.describe)('fuse', () => {
        (0, vitest_1.it)('should fuse matching records', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'John Doe', email: 'john@example.com' } },
                { sourceId: 'src2', recordId: '2', data: { name: 'John Doe', phone: '555-1234' } },
            ];
            const results = await engine.fuse(records, ['name']);
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].fusedRecord).toHaveProperty('name', 'John Doe');
            (0, vitest_1.expect)(results[0].fusedRecord).toHaveProperty('email', 'john@example.com');
            (0, vitest_1.expect)(results[0].fusedRecord).toHaveProperty('phone', '555-1234');
            (0, vitest_1.expect)(results[0].sourceRecords).toHaveLength(2);
        });
        (0, vitest_1.it)('should not fuse non-matching records', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'John Doe', email: 'john@example.com' } },
                { sourceId: 'src2', recordId: '2', data: { name: 'Jane Smith', email: 'jane@example.com' } },
            ];
            const results = await engine.fuse(records, ['name']);
            (0, vitest_1.expect)(results).toHaveLength(2);
        });
        (0, vitest_1.it)('should handle single record', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'John Doe' } },
            ];
            const results = await engine.fuse(records, ['name']);
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].fusedRecord.name).toBe('John Doe');
        });
        (0, vitest_1.it)('should resolve conflicts using most_complete strategy', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'John', desc: 'Short' } },
                { sourceId: 'src2', recordId: '2', data: { name: 'John', desc: 'A much longer description' } },
            ];
            const results = await engine.fuse(records, ['name']);
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].fusedRecord.desc).toBe('A much longer description');
        });
    });
    (0, vitest_1.describe)('deduplicate', () => {
        (0, vitest_1.it)('should identify duplicate records', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'John Doe', email: 'john@example.com' } },
                { sourceId: 'src1', recordId: '2', data: { name: 'John Doe', email: 'john@example.com' } },
                { sourceId: 'src1', recordId: '3', data: { name: 'Jane Smith', email: 'jane@example.com' } },
            ];
            const results = await engine.deduplicate(records, ['name', 'email']);
            (0, vitest_1.expect)(results).toHaveLength(1);
            (0, vitest_1.expect)(results[0].duplicatesRemoved).toBe(1);
        });
        (0, vitest_1.it)('should return empty array for no duplicates', async () => {
            const records = [
                { sourceId: 'src1', recordId: '1', data: { name: 'John', email: 'john@example.com' } },
                { sourceId: 'src1', recordId: '2', data: { name: 'Jane', email: 'jane@example.com' } },
            ];
            const results = await engine.deduplicate(records, ['name', 'email']);
            (0, vitest_1.expect)(results).toHaveLength(0);
        });
    });
});
