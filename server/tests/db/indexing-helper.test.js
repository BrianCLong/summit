"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const indexing_js_1 = require("../../src/db/migrations/indexing.js");
(0, globals_1.describe)('managed index SQL helper', () => {
    const originalFlag = process.env.INDEX_CONCURRENT;
    (0, globals_1.afterEach)(() => {
        process.env.INDEX_CONCURRENT = originalFlag;
    });
    (0, globals_1.it)('builds a partial index with concurrent clause when the flag is enabled', () => {
        process.env.INDEX_CONCURRENT = '1';
        const result = (0, indexing_js_1.buildCreateIndexSql)({
            tableName: 'events',
            columns: ['tenant_id', 'created_at'],
            predicate: 'active = true',
        });
        (0, globals_1.expect)(result.name).toBe('events_tenant_id_created_at_idx');
        (0, globals_1.expect)(result.sql).toContain('CONCURRENTLY');
        (0, globals_1.expect)(result.sql).toContain('WHERE active = true');
        (0, globals_1.expect)(result.sql).toContain('"tenant_id", "created_at"');
        (0, globals_1.expect)(result.concurrently).toBe(true);
    });
    (0, globals_1.it)('omits concurrent builds when the feature flag is disabled', () => {
        process.env.INDEX_CONCURRENT = '0';
        const result = (0, indexing_js_1.buildCreateIndexSql)({
            tableName: 'cases',
            columns: ['id'],
            unique: true,
        });
        (0, globals_1.expect)(result.sql).not.toContain('CONCURRENTLY');
        (0, globals_1.expect)(result.sql).toContain('UNIQUE INDEX');
        (0, globals_1.expect)(result.concurrently).toBe(false);
    });
    (0, globals_1.it)('generates drop statements that honor concurrency', () => {
        process.env.INDEX_CONCURRENT = '1';
        const indexName = (0, indexing_js_1.buildIndexName)({ tableName: 'audit', columns: ['id'] });
        const result = (0, indexing_js_1.buildDropIndexSql)({ indexName });
        (0, globals_1.expect)(result.sql).toContain('DROP INDEX CONCURRENTLY IF EXISTS');
        (0, globals_1.expect)(result.sql).toContain(indexName);
    });
});
