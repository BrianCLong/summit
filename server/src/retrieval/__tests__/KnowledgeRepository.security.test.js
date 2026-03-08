"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const KnowledgeRepository_js_1 = require("../KnowledgeRepository.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('KnowledgeRepository security', () => {
    (0, globals_1.it)('blocks SQL injection in topK', async () => {
        let executedSql = '';
        let executedParams = [];
        const mockClient = {
            query: async (sql, params) => {
                executedSql = sql;
                executedParams = params;
                return { rows: [] };
            },
            release: () => { },
        };
        const mockPool = {
            connect: async () => mockClient,
        };
        const repo = new KnowledgeRepository_js_1.KnowledgeRepository(mockPool);
        const maliciousQuery = {
            tenantId: 'tenant-1',
            queryKind: 'keyword',
            queryText: 'test',
            topK: '10; DROP TABLE knowledge_objects; --',
        };
        await repo.searchKeyword(maliciousQuery);
        (0, globals_1.expect)(executedSql).not.toMatch(/DROP TABLE/);
        (0, globals_1.expect)(executedSql).toMatch(/LIMIT \$\d+/);
        (0, globals_1.expect)(executedParams[executedParams.length - 1]).toBe(10);
    });
    (0, globals_1.it)('parses string topK', async () => {
        let executedParams = [];
        const mockClient = {
            query: async (sql, params) => {
                executedParams = params;
                return { rows: [] };
            },
            release: () => { },
        };
        const mockPool = {
            connect: async () => mockClient,
        };
        const repo = new KnowledgeRepository_js_1.KnowledgeRepository(mockPool);
        const query = {
            tenantId: 'tenant-1',
            queryKind: 'keyword',
            queryText: 'test',
            topK: '50',
        };
        await repo.searchKeyword(query);
        (0, globals_1.expect)(executedParams[executedParams.length - 1]).toBe(50);
    });
});
