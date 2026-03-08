"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ChunkingService_js_1 = require("../ChunkingService.js");
(0, globals_1.describe)('ChunkingService', () => {
    let chunkingService;
    (0, globals_1.beforeEach)(() => {
        chunkingService = new ChunkingService_js_1.ChunkingService();
    });
    (0, globals_1.it)('should chunk simple text', () => {
        const now = new Date().toISOString();
        const doc = {
            id: 'doc1',
            tenantId: 'tenant1',
            source: { system: 'unit-test', id: 'doc1' },
            text: 'Hello world. This is a test.',
            metadata: {},
            entityIds: [],
            createdAt: now,
            updatedAt: now,
        };
        const chunks = chunkingService.chunkDocument(doc, 10, 2);
        (0, globals_1.expect)(chunks.length).toBeGreaterThan(0);
        (0, globals_1.expect)(chunks[0].text).toBeDefined();
    });
    (0, globals_1.it)('should respect semantic boundaries (paragraphs)', () => {
        const now = new Date().toISOString();
        const text = 'Para 1.\n\nPara 2 is longer.\n\nPara 3.';
        const doc = {
            id: 'doc2',
            tenantId: 'tenant1',
            source: { system: 'unit-test', id: 'doc2' },
            text: text,
            metadata: {},
            entityIds: [],
            createdAt: now,
            updatedAt: now,
        };
        // Small chunk size to force split, but large enough for one para
        const chunks = chunkingService.chunkDocument(doc, 50, 0);
        // Should ideally be one chunk per para if they fit
        // Length of "Para 1." is 7. "Para 2 is longer." is 17.
        // Combined is 24 + 2 (newlines) = 26.
        // If chunk size is 50, all should fit in one chunk actually.
        (0, globals_1.expect)(chunks.length).toBe(1);
        (0, globals_1.expect)(chunks[0].text).toContain('Para 1.');
        (0, globals_1.expect)(chunks[0].text).toContain('Para 3.');
    });
    (0, globals_1.it)('should split huge paragraphs', () => {
        const now = new Date().toISOString();
        const hugeText = 'A'.repeat(100);
        const doc = {
            id: 'doc3',
            tenantId: 'tenant1',
            source: { system: 'unit-test', id: 'doc3' },
            text: hugeText,
            metadata: {},
            entityIds: [],
            createdAt: now,
            updatedAt: now,
        };
        const chunks = chunkingService.chunkDocument(doc, 20, 5);
        (0, globals_1.expect)(chunks.length).toBeGreaterThan(1);
        (0, globals_1.expect)(chunks[0].text.length).toBe(20);
        (0, globals_1.expect)(chunks[1].text.length).toBe(20);
    });
});
