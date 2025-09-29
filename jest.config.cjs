/** Root Jest config – safe regex, tight roots, no archives. */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Use SWC for fast TypeScript/JavaScript transformation
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true,
        },
        target: 'es2020',
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
      module: {
        type: 'commonjs',
      },
    }],
  },

  // Crawl only active code (add apps/* later after dedupe)
  roots: ['<rootDir>/server', '<rootDir>/client', '<rootDir>/packages'],

  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],

  // Do not collect tests from build outputs or archives
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '<rootDir>/server/dist/',
    '<rootDir>/packages/.*/dist/',
    '<rootDir>/client/dist/',
    '<rootDir>/archive/',
    '<rootDir>/archive_\\d+/',
    '<rootDir>/archive-[^/]+/',
    '<rootDir>/.*/_salvage[^/]*',
    '<rootDir>/.*/pull/[^/]+/head'
  ],

  // Keep file-watcher calm around big junk trees
  watchPathIgnorePatterns: [
    '<rootDir>/archive',
    '<rootDir>/archive_.*',
    '<rootDir>/.*/_salvage.*',
    '<rootDir>/.*/pull/.*/head'
  ],

  // Also keep the resolver out of dist trees
  modulePathIgnorePatterns: [
    '<rootDir>/.*/dist/',
    '<rootDir>/server/dist/',
    '<rootDir>/packages/.*/dist/',
    '<rootDir>/client/dist/'
  ],

  // ESM/CJS shim + optional alias
  moduleNameMapper: {
    '^node-fetch$': '<rootDir>/__mocks__/node-fetch.js',
    '^@server/(.*)$': '<rootDir>/server/src/$1'
  },

  // Allow specific ESM deps
  transformIgnorePatterns: ['node_modules/(?!(@whatwg-node|undici-types))/']
};