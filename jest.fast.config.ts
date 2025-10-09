import type { Config } from 'jest';
import fs from 'node:fs';
import path from 'node:path';

function loadFlaky(): string[] {
  const f = path.join(__dirname, 'tests', 'FLAKY.ignore');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !s.startsWith('#'));
}

const quarantines = loadFlaky();

// Convert globs to regex-friendly ignores
const testPathIgnorePatterns = [
  '/node_modules/', '/dist/', '/build/', '/.next/', '/coverage/',
  // Explicit quarantines
  ...quarantines.map(g => g.replace(/\./g, '\\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
];

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup-tests.ts'],
  moduleNameMapper: {
    '^argon2$': '<rootDir>/__mocks__/argon2.ts',
    '^archiver$': '<rootDir>/__mocks__/archiver.ts'
  },
  testPathIgnorePatterns,
  // Keep snapshots/doc tests out of fast lane unless essential
  testMatch: [
    '<rootDir>/**/?(*.)+(test|spec).[jt]s?(x)'
  ],
  maxWorkers: '50%'
};

export default config;
