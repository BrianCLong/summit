"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Infrastructure Check', () => {
    (0, globals_1.it)('should verify node environment', () => {
        (0, globals_1.expect)(process.version).toBeDefined();
        (0, globals_1.expect)(process.env.NODE_ENV).toBeDefined();
    });
    (0, globals_1.it)('should have math working correctly', () => {
        (0, globals_1.expect)(1 + 1).toBe(2);
    });
});
