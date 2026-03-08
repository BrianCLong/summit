"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const searchTestUtils_1 = require("../utils/searchTestUtils");
test_1.test.describe('Search Isolation', () => {
    const tenant1Id = 'tenant-1';
    const tenant2Id = 'tenant-2';
    let documents;
    test_1.test.beforeAll(() => {
        documents = (0, searchTestUtils_1.generateSeedDocuments)(tenant1Id, tenant2Id);
    });
    test_1.test.beforeEach(async ({ request }) => {
        // Reset the search service state before each test
        await request.post('http://localhost:8000/search/reindex/start', { data: { label: 'test-index', batchSize: 10 } });
        await (0, searchTestUtils_1.seedSearchData)(request, documents);
        await request.post('http://localhost:8000/search/reindex/run', { data: { batchSize: 10 } });
        await request.post('http://localhost:8000/search/reindex/cutover', { data: { label: 'test-index' } });
    });
    (0, test_1.test)('should not return search results from another tenant', async ({ request }) => {
        const tenant1Canary = documents.find(d => d.tenantId === tenant1Id).canary;
        const tenant2Canary = documents.find(d => d.tenantId === tenant2Id).canary;
        // Search as tenant 1
        const response1 = await request.post('http://localhost:8000/search/query', {
            headers: { 'X-Tenant-ID': tenant1Id },
            data: { query: 'graph analytics', backend: 'mock', filters: { tenantId: tenant1Id } },
        });
        (0, test_1.expect)(response1.ok()).toBeTruthy();
        const results1 = await response1.json();
        // Verify that tenant 1's results only contain tenant 1's canary
        (0, test_1.expect)(results1.hits.length).toBeGreaterThan(0);
        for (const hit of results1.hits) {
            (0, test_1.expect)(hit.source.canary).toBe(tenant1Canary);
            (0, test_1.expect)(hit.source.canary).not.toBe(tenant2Canary);
        }
        // Search as tenant 2
        const response2 = await request.post('http://localhost:8000/search/query', {
            headers: { 'X-Tenant-ID': tenant2Id },
            data: { query: 'graph analytics', backend: 'mock', filters: { tenantId: tenant2Id } },
        });
        (0, test_1.expect)(response2.ok()).toBeTruthy();
        const results2 = await response2.json();
        // Verify that tenant 2's results only contain tenant 2's canary
        (0, test_1.expect)(results2.hits.length).toBeGreaterThan(0);
        for (const hit of results2.hits) {
            (0, test_1.expect)(hit.source.canary).toBe(tenant2Canary);
            (0, test_1.expect)(hit.source.canary).not.toBe(tenant1Canary);
        }
    });
    (0, test_1.test)('should not return typeahead suggestions from another tenant', async ({ request }) => {
        // Typeahead suggestions are based on previous queries, so we need to seed some query history
        await request.post('http://localhost:8000/search/query', {
            headers: { 'X-Tenant-ID': tenant1Id },
            data: { query: 'tenant-1-specific-query', backend: 'mock' },
        });
        await request.post('http://localhost:8000/search/query', {
            headers: { 'X-Tenant-ID': tenant2Id },
            data: { query: 'tenant-2-specific-query', backend: 'mock' },
        });
        // Get suggestions for tenant 1
        const response1 = await request.get('http://localhost:8000/search/suggest?q=tenant', {
            headers: { 'X-Tenant-ID': tenant1Id },
        });
        (0, test_1.expect)(response1.ok()).toBeTruthy();
        const suggestions1 = await response1.json();
        // Verify that tenant 1's suggestions do not contain tenant 2's query
        (0, test_1.expect)(suggestions1.some(s => s.text === 'tenant-1-specific-query')).toBeTruthy();
        (0, test_1.expect)(suggestions1.some(s => s.text === 'tenant-2-specific-query')).toBeFalsy();
        // Get suggestions for tenant 2
        const response2 = await request.get('http://localhost:8000/search/suggest?q=tenant', {
            headers: { 'X-Tenant-ID': tenant2Id },
        });
        (0, test_1.expect)(response2.ok()).toBeTruthy();
        const suggestions2 = await response2.json();
        // Verify that tenant 2's suggestions do not contain tenant 1's query
        (0, test_1.expect)(suggestions2.some(s => s.text === 'tenant-2-specific-query')).toBeTruthy();
        (0, test_1.expect)(suggestions2.some(s => s.text === 'tenant-1-specific-query')).toBeFalsy();
    });
});
