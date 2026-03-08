"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Sample Fast Lane Test', () => {
    (0, globals_1.it)('should pass a simple assertion', () => {
        (0, globals_1.expect)(1 + 1).toBe(2);
    });
    (0, globals_1.it)('should handle string operations', () => {
        const testString = 'hello world';
        (0, globals_1.expect)(testString.toUpperCase()).toBe('HELLO WORLD');
    });
});
