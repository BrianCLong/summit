"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        include: ['__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/types/**', 'src/**/index.ts'],
            thresholds: {
                lines: 85,
                functions: 85,
                branches: 80,
                statements: 85,
            },
        },
        testTimeout: 10000,
    },
});
