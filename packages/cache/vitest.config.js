"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        coverage: { reporter: ['text', 'lcov', 'json-summary'] },
        include: ['src/__tests__/**/*.test.ts'],
        globals: true,
        environment: 'node',
    },
});
