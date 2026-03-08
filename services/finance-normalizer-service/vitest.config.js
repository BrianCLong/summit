"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/types.ts',
                'vitest.config.ts',
            ],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 60,
                statements: 70,
            },
        },
        testTimeout: 10000,
        hookTimeout: 10000,
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
});
