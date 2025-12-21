import type { Config } from 'jest';
const config: Config = { testEnvironment: 'node', roots: ['<rootDir>'], transform: { '^.+\\.(t|j)sx?$': ['ts-jest', {}] } };
export default config;
