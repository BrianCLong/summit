"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'src/**/*.test.ts',
                'src/index.ts',
            ],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 60,
                statements: 70,
            },
        },
        testTimeout: 10000,
    },
});
