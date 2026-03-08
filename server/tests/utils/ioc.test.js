"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ioc_1 = require("@/utils/ioc");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('normalizeIoC', () => {
    (0, globals_1.it)('lowercases and converts domains to punycode', () => {
        const normalized = (0, ioc_1.normalizeIoC)('domain', 'Bücher.de');
        (0, globals_1.expect)(normalized).toBe('xn--bcher-kva.de');
    });
    (0, globals_1.it)('strips plus tags from emails', () => {
        const normalized = (0, ioc_1.normalizeIoC)('email', 'User+test@Example.com');
        (0, globals_1.expect)(normalized).toBe('user@example.com');
    });
    (0, globals_1.it)('normalizes urls', () => {
        const normalized = (0, ioc_1.normalizeIoC)('url', 'HTTPS://Example.com/Path');
        (0, globals_1.expect)(normalized).toBe('https://example.com/Path');
    });
});
(0, globals_1.describe)('fuse', () => {
    (0, globals_1.it)('combines confidence scores', () => {
        (0, globals_1.expect)((0, ioc_1.fuse)([80, 50])).toBe(90);
    });
    (0, globals_1.it)('clamps inputs outside range', () => {
        (0, globals_1.expect)((0, ioc_1.fuse)([200, -50])).toBe(100);
    });
});
