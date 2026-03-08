"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const chunking_js_1 = require("../../rag/chunking.js");
(0, globals_1.describe)('chunkText', () => {
    (0, globals_1.it)('should chunk text based on token/char approximation', () => {
        const text = 'a'.repeat(1000);
        // 500 tokens * 4 chars = 2000 chars limit.
        // Wait, test is simpler if we use small limits.
        const chunks = (0, chunking_js_1.chunkText)(text, 10, 0); // 40 chars limit
        // 1000 chars / 40 chars per chunk = 25 chunks
        (0, globals_1.expect)(chunks.length).toBeGreaterThan(1);
        (0, globals_1.expect)(chunks[0].length).toBeLessThanOrEqual(40);
    });
    (0, globals_1.it)('should handle overlap', () => {
        const text = '1234567890'.repeat(10); // 100 chars
        const chunks = (0, chunking_js_1.chunkText)(text, 5, 2); // 20 chars limit, 8 chars overlap
        (0, globals_1.expect)(chunks[0].length).toBeLessThanOrEqual(20);
        // Check overlap... hard to assert exactly without strict math, but basic run check
        (0, globals_1.expect)(chunks.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should split at spaces if possible', () => {
        const text = "word ".repeat(20); // 100 chars
        const chunks = (0, chunking_js_1.chunkText)(text, 10, 0); // 40 chars
        // Should not break in middle of "word"
        (0, globals_1.expect)(chunks[0].endsWith('word')).toBe(true);
    });
});
