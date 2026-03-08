"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const RagContextBuilder_js_1 = require("../RagContextBuilder.js");
// Mock RetrievalService
const mockRetrievalService = {
    search: globals_1.jest.fn()
};
(0, globals_1.describe)('RagContextBuilder', () => {
    let builder;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        builder = new RagContextBuilder_js_1.RagContextBuilder(mockRetrievalService);
    });
    (0, globals_1.it)('should build context within token limits', async () => {
        // Setup mock response
        mockRetrievalService.search.mockResolvedValue({
            tenantId: 'tenant-1',
            items: [
                {
                    object: { id: '1', kind: 'document', title: 'Doc 1', body: 'Short content', metadata: {} },
                    score: 0.9
                },
                {
                    object: { id: '2', kind: 'document', title: 'Doc 2', body: 'Medium content '.repeat(10), metadata: {} },
                    score: 0.8
                }
            ]
        });
        const result = await builder.buildContext({
            tenantId: 'tenant-1',
            queryText: 'test',
            maxTokens: 100 // Very restrictive limit
        });
        (0, globals_1.expect)(result.snippets.length).toBeGreaterThan(0);
        (0, globals_1.expect)(result.totalTokens).toBeLessThanOrEqual(100);
    });
    (0, globals_1.it)('should truncate large documents', async () => {
        const longContent = 'word '.repeat(1000); // ~1000 tokens roughly
        mockRetrievalService.search.mockResolvedValue({
            tenantId: 'tenant-1',
            items: [
                {
                    object: { id: '1', kind: 'document', title: 'Long Doc', body: longContent, metadata: {} },
                    score: 0.9
                }
            ]
        });
        const result = await builder.buildContext({
            tenantId: 'tenant-1',
            queryText: 'test',
            maxTokens: 50
        });
        (0, globals_1.expect)(result.snippets).toHaveLength(1);
        (0, globals_1.expect)(result.snippets[0].content.length).toBeLessThan(longContent.length);
        (0, globals_1.expect)(result.totalTokens).toBeLessThanOrEqual(50);
    });
});
