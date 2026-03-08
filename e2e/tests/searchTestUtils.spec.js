"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const searchTestUtils_1 = require("../utils/searchTestUtils");
test_1.test.describe('Search Test Utils', () => {
    (0, test_1.test)('should generate seed documents with unique canaries for each tenant', () => {
        const tenant1Id = 'tenant-1';
        const tenant2Id = 'tenant-2';
        const documents = (0, searchTestUtils_1.generateSeedDocuments)(tenant1Id, tenant2Id);
        const tenant1Docs = documents.filter(d => d.tenantId === tenant1Id);
        const tenant2Docs = documents.filter(d => d.tenantId === tenant2Id);
        (0, test_1.expect)(tenant1Docs.length).toBeGreaterThan(0);
        (0, test_1.expect)(tenant2Docs.length).toBeGreaterThan(0);
        const tenant1Canary = tenant1Docs[0].canary;
        const tenant2Canary = tenant2Docs[0].canary;
        (0, test_1.expect)(tenant1Canary).not.toBe(tenant2Canary);
        for (const doc of tenant1Docs) {
            (0, test_1.expect)(doc.canary).toBe(tenant1Canary);
        }
        for (const doc of tenant2Docs) {
            (0, test_1.expect)(doc.canary).toBe(tenant2Canary);
        }
    });
});
