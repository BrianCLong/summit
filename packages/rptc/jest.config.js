"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    testMatch: ['<rootDir>/test/**/*.test.ts'],
    collectCoverageFrom: ['src/**/*.ts'],
    coverageDirectory: '<rootDir>/coverage',
    clearMocks: true,
};
exports.default = config;
