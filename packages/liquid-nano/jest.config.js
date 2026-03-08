"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    rootDir: '.',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    setupFilesAfterEnv: ['<rootDir>/scripts/tests/setup.ts'],
    reporters: ['default'],
    verbose: false
};
exports.default = config;
