/** @summit_type_script_architecture.md {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup-tests.ts'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    // CSS modules & plain CSS
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Static assets
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.cjs',
    // Optional UI alias
    '^@ui/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['<rootDir>/**/?(*.)+(test|spec).[tj]s?(x)'],
  cacheDirectory: '<rootDir>/.jest-cache-ui',
  maxWorkers: '50%',
  verbose: false,
  // keep the scan tight
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/coverage/'],
};
