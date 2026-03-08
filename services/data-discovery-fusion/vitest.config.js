"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
        testTimeout: 10000,
    },
});
