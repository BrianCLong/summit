"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stringUtils_js_1 = require("./stringUtils.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('String Utils', () => {
    (0, globals_1.it)('should capitalize the first letter of a string', () => {
        (0, globals_1.expect)((0, stringUtils_js_1.capitalize)('hello')).toBe('Hello');
        (0, globals_1.expect)((0, stringUtils_js_1.capitalize)('world')).toBe('World');
        (0, globals_1.expect)((0, stringUtils_js_1.capitalize)('')).toBe('');
    });
    (0, globals_1.it)('should reverse a string', () => {
        (0, globals_1.expect)((0, stringUtils_js_1.reverse)('hello')).toBe('olleh');
        (0, globals_1.expect)((0, stringUtils_js_1.reverse)('world')).toBe('dlrow');
        (0, globals_1.expect)((0, stringUtils_js_1.reverse)('')).toBe('');
    });
});
