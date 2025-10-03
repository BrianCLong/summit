#!/usr/bin/env node
/* Usage:
 *   pnpm write-tests path/to/file.cjs
 *   npm run write-tests -- path/to/file.cjs
 */
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target) {
  console.error('Usage: write-tests <path/to/file>');
  process.exit(1);
}

const abs = path.resolve(target);
const rel = path.relative(process.cwd(), abs);
const base = path.basename(rel);
const safeName = base.replace(/\W+/g, '_');
const testDir = path.join(process.cwd(), '__tests__');
const out = path.join(testDir, `${safeName}.test.cjs`);

const tpl = `/**
 * Auto-scaffolded test for: ${rel}
 * Replace "TODO" sections with real assertions.
 */
const path = require('path');

// Example: If the module exports functions:
let mod;
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  // If it's a pure script/CLI, consider spawning a child process (see oct25 importer tests)
  try {
    mod = require(path.resolve('${rel}'));
  } catch (e) {
    // It's OK if it's CLI-only; update the test to spawn node with args
  }
});

test('loads without crashing', () => {
  expect(true).toBe(true);
});

// TODO: Add meaningful tests below
test('TODO: describe expected behavior', async () => {
  // Example:
  // expect(typeof mod.someExport).toBe('function');
});
`;

fs.mkdirSync(testDir, { recursive: true });
if (fs.existsSync(out)) {
  console.error(`Refusing to overwrite existing test: ${path.relative(process.cwd(), out)}`);
  process.exit(2);
}
fs.writeFileSync(out, tpl);
console.log('Created', path.relative(process.cwd(), out));
