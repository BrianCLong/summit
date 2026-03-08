"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Test environment parity', () => {
    (0, globals_1.it)('standardizes timezone and locale for deterministic tests', () => {
        (0, globals_1.expect)(process.env.TZ).toBe('UTC');
        (0, globals_1.expect)(process.env.LANG).toBe('en_US.UTF-8');
        (0, globals_1.expect)(process.env.LC_ALL).toBe('en_US.UTF-8');
        (0, globals_1.expect)(process.env.NODE_ENV).toBe('test');
    });
});
