"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: '<rootDir>/tsconfig.json',
            },
        ],
    },
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
    coverageDirectory: 'coverage',
    moduleFileExtensions: ['ts', 'js', 'json'],
    clearMocks: true,
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
exports.default = config;
