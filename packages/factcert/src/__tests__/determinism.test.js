"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const stable_json_js_1 = require("../lib/stable_json.js");
(0, vitest_1.describe)('stableJson', () => {
    (0, vitest_1.it)('sorts keys', () => {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { b: 2, a: 1 };
        (0, vitest_1.expect)((0, stable_json_js_1.stableJson)(obj1)).toBe((0, stable_json_js_1.stableJson)(obj2));
    });
    (0, vitest_1.it)('handles nested objects', () => {
        const obj1 = { a: { c: 3, d: 4 }, b: 2 };
        const obj2 = { b: 2, a: { d: 4, c: 3 } };
        (0, vitest_1.expect)((0, stable_json_js_1.stableJson)(obj1)).toBe((0, stable_json_js_1.stableJson)(obj2));
    });
    (0, vitest_1.it)('handles arrays', () => {
        const arr = [1, 2, 3];
        (0, vitest_1.expect)((0, stable_json_js_1.stableJson)(arr)).toBe('[1,2,3]');
    });
});
