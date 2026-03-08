"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testRegex: '.*\\.test\\.ts$',
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    transform: {
        '^.+\\.[tj]s$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: '<rootDir>/tsconfig.json'
            }
        ]
    },
    extensionsToTreatAsEsm: ['.ts'],
    collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}', '!<rootDir>/src/**/*.d.ts'],
    globals: {
        'ts-jest': {
            useESM: true,
            tsconfig: '<rootDir>/tsconfig.json'
        }
    }
};
exports.default = config;
