"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        coverage: { reporter: ['text', 'lcov', 'json-summary'] },
        include: ['src/**/*.test.ts'],
        globals: true, // Use globals if I used them (I used import, so maybe not needed, but safe)
    },
});
