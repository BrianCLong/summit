"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        include: ['tests/**/*.test.ts'],
        environment: 'node',
        coverage: {
            reporter: ['text', 'lcov'],
        },
    },
});
