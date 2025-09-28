/** Jest config for services/api */
module.exports = {
  roots: ['<rootDir>/src/graphql/__tests__'],
  transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
  testEnvironment: 'node',
  moduleFileExtensions: ['ts','tsx','js','jsx','json','node'],
  moduleNameMapper: { '^(.*)\\.js$': '$1' },
  globals: { 'ts-jest': { useESM: true, tsconfig: { esModuleInterop: true } } },
};
