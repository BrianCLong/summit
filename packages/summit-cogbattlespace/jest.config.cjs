module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@intelgraph/summit-schemas$': '<rootDir>/../summit-schemas/src/index.ts',
    '^@intelgraph/summit-schemas/(.*)$': '<rootDir>/../summit-schemas/src/$1'
  },
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts']
};
