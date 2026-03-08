"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests', '<rootDir>/src'],
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/types/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
                useESM: true,
            }],
    },
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testTimeout: 30000,
};
exports.default = config;
