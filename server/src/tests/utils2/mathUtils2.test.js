"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mathUtils2_js_1 = require("./mathUtils2.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Math Utils 2', () => {
    (0, globals_1.it)('should subtract two numbers correctly', () => {
        (0, globals_1.expect)((0, mathUtils2_js_1.subtract)(5, 3)).toBe(2);
        (0, globals_1.expect)((0, mathUtils2_js_1.subtract)(0, 5)).toBe(-5);
        (0, globals_1.expect)((0, mathUtils2_js_1.subtract)(-2, -3)).toBe(1);
    });
    (0, globals_1.it)('should divide two numbers correctly', () => {
        (0, globals_1.expect)((0, mathUtils2_js_1.divide)(10, 2)).toBe(5);
        (0, globals_1.expect)((0, mathUtils2_js_1.divide)(7, 2)).toBe(3.5);
        (0, globals_1.expect)((0, mathUtils2_js_1.divide)(-6, 3)).toBe(-2);
    });
    (0, globals_1.it)('should throw error when dividing by zero', () => {
        (0, globals_1.expect)(() => (0, mathUtils2_js_1.divide)(5, 0)).toThrow('Division by zero');
    });
});
