export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tests/e2e/tsconfig.json'
    }]
  },
  moduleNameMapper: {
    '^@intelgraph/governance-kernel$': '<rootDir>/../../platform/governance-kernel/src/index.ts',
    '^@intelgraph/core$': '<rootDir>/../../platform/intelgraph-core/src/index.ts',
    '^@intelgraph/maestro-core$': '<rootDir>/../../platform/maestro-core/src/index.ts',
    '^@intelgraph/securiteyes$': '<rootDir>/../../platform/securiteyes/src/index.ts',
    '^@intelgraph/aurelius$': '<rootDir>/../../platform/aurelius/src/index.ts',
    '^@intelgraph/summitsight$': '<rootDir>/../../platform/summitsight/src/index.ts',
    '^@intelgraph/maas$': '<rootDir>/../../platform/maas/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
