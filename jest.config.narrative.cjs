module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { useESM: true, tsconfig: { allowJs: true } }]
  },
  testMatch: ['**/tests/narrative/**/*.test.ts', '**/server/src/tests/narrative/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(zod|proxy-addr|ipaddr.js)/)'],
};
