"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('canonicalization', () => {
    (0, vitest_1.it)('produces stable ordering for objects and arrays', () => {
        const value = { b: 2, a: { z: 1, y: 2 }, list: [3, 2, 1] };
        const canonical = (0, index_js_1.canonicalStringify)(value);
        (0, vitest_1.expect)(canonical).toBe('{"a":{"y":2,"z":1},"b":2,"list":[3,2,1]}');
    });
    (0, vitest_1.it)('normalizes numbers and strings deterministically', () => {
        const value = { num: 1.23456789123, text: 'héllo\nworld' };
        const canonical = (0, index_js_1.canonicalize)(value);
        (0, vitest_1.expect)(canonical.num).toBeCloseTo(1.23456789123, 12);
        (0, vitest_1.expect)(canonical.text.includes('\n')).toBe(false);
    });
    (0, vitest_1.it)('produces stable hashes across equivalent payloads', () => {
        const a = { foo: 'bar', nested: { a: 1 } };
        const b = { nested: { a: 1 }, foo: 'bar' };
        (0, vitest_1.expect)((0, index_js_1.stableHash)(a)).toEqual((0, index_js_1.stableHash)(b));
    });
    (0, vitest_1.it)('normalizes timestamps regardless of timezone string', () => {
        const ts = (0, index_js_1.normalizeTimestamp)('2024-01-01T00:00:00-05:00');
        (0, vitest_1.expect)(ts).toBe('2024-01-01T05:00:00.000Z');
    });
});
