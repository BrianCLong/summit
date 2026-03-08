"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const stable_json_js_1 = require("../src/lib/stable_json.js");
(0, vitest_1.describe)('stableStringify', () => {
    (0, vitest_1.it)('should be deterministic', () => {
        const obj1 = { b: 1, a: 2, c: [3, 2, 1] };
        const obj2 = { a: 2, c: [3, 2, 1], b: 1 };
        (0, vitest_1.expect)((0, stable_json_js_1.stableStringify)(obj1)).toBe((0, stable_json_js_1.stableStringify)(obj2));
    });
    (0, vitest_1.it)('should sort keys', () => {
        const obj = { b: 1, a: 2 };
        (0, vitest_1.expect)((0, stable_json_js_1.stableStringify)(obj)).toBe('{"a":2,"b":1}');
    });
    (0, vitest_1.it)('should handle nested objects', () => {
        const obj = { b: { d: 4, c: 3 }, a: 1 };
        (0, vitest_1.expect)((0, stable_json_js_1.stableStringify)(obj)).toBe('{"a":1,"b":{"c":3,"d":4}}');
    });
    (0, vitest_1.it)('should handle primitives', () => {
        (0, vitest_1.expect)((0, stable_json_js_1.stableStringify)(123)).toBe('123');
        (0, vitest_1.expect)((0, stable_json_js_1.stableStringify)('abc')).toBe('"abc"');
        (0, vitest_1.expect)((0, stable_json_js_1.stableStringify)(null)).toBe('null');
        (0, vitest_1.expect)((0, stable_json_js_1.stableStringify)(true)).toBe('true');
    });
});
