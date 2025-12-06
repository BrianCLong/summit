/** Jest config for services/api */
module.exports = {
  roots: ['<rootDir>/src/graphql/__tests__', '<rootDir>/src/middleware/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: { '^(.*)\\.js$': '$1' },
  globals: { 'ts-jest': { useESM: true, tsconfig: { esModuleInterop: true } } },
};
