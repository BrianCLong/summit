
const fs = require('fs');
const path = require('path');

// NOTE: We cannot easily import default export from ESM .ts config in CJS .cjs
// So we replicate the config or use ts-node to run it.
// Simpler approach: Create a minimal config for quarantine that extends what we need.

// Read quarantine list
const quarantinePath = path.join(__dirname, 'tests/quarantine/list.json');
let quarantineList = [];
try {
  if (fs.existsSync(quarantinePath)) {
    const data = fs.readFileSync(quarantinePath, 'utf8');
    quarantineList = JSON.parse(data).tests.map(t => t.id);
  }
} catch (e) {
  console.warn('Failed to load quarantine list:', e.message);
}

// Convert IDs to regex parts for testNamePattern
// Escape regex characters
const escapedIds = quarantineList.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.cjs',
    'jest-extended/all',
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/src/tests/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/playwright-tests/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],

  // Run ONLY quarantined tests
  testNamePattern: escapedIds.length > 0 ? `(${escapedIds.join('|')})` : '^matches_nothing_to_ensure_pass$',

  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'test-results', outputName: 'junit-quarantine.xml' }]
  ],

  globals: {
     // In quarantine mode, we do NOT filter them out in setup.
     __QUARANTINED_TESTS__: []
  }
};
