"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mathUtils_js_1 = require("./mathUtils.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Math Utils', () => {
    (0, globals_1.it)('should add two numbers correctly', () => {
        (0, globals_1.expect)((0, mathUtils_js_1.add)(2, 3)).toBe(5);
        (0, globals_1.expect)((0, mathUtils_js_1.add)(-1, 1)).toBe(0);
        (0, globals_1.expect)((0, mathUtils_js_1.add)(0, 0)).toBe(0);
    });
    (0, globals_1.it)('should multiply two numbers correctly', () => {
        (0, globals_1.expect)((0, mathUtils_js_1.multiply)(2, 3)).toBe(6);
        (0, globals_1.expect)((0, mathUtils_js_1.multiply)(-2, 3)).toBe(-6);
        (0, globals_1.expect)((0, mathUtils_js_1.multiply)(0, 5)).toBe(0);
    });
});
