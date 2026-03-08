"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_1 = require("../src/client");
const sse_1 = require("../src/sse");
(0, vitest_1.describe)('McpClient', () => {
    (0, vitest_1.it)('constructs', () => {
        const c = new client_1.McpClient('http://localhost:8080', 'token');
        (0, vitest_1.expect)(c).toBeTruthy();
    });
    (0, vitest_1.it)('exposes sse helper', () => {
        (0, vitest_1.expect)(typeof sse_1.sse).toBe('function');
    });
    (0, vitest_1.it)('provides stream generator', () => {
        const c = new client_1.McpClient('http://localhost:8080', 'token');
        const iterator = c.stream({ id: 'sess-test' });
        (0, vitest_1.expect)(typeof iterator[Symbol.asyncIterator]).toBe('function');
    });
    (0, vitest_1.it)('provides capability discovery methods', () => {
        const c = new client_1.McpClient('http://localhost:8080', 'token');
        (0, vitest_1.expect)(typeof c.listTools).toBe('function');
        (0, vitest_1.expect)(typeof c.listResources).toBe('function');
        (0, vitest_1.expect)(typeof c.listPrompts).toBe('function');
    });
});
