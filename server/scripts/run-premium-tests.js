#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, '.tmp-tests');

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

const compile = spawnSync(
  'tsc',
  ['-p', 'tsconfig.json', '--outDir', outDir, '--noEmit', 'false'],
  { cwd: projectRoot, stdio: 'inherit' },
);

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const tests = [];
const beforeEachHooks = [];
const afterAllHooks = [];

global.describe = (_name, fn) => fn();
global.test = (name, fn) => tests.push({ name, fn });
global.it = global.test;
global.beforeEach = (fn) => beforeEachHooks.push(fn);
global.afterAll = (fn) => afterAllHooks.push(fn);

const makeExpect = (received) => ({
  toBe: (expected) => {
    if (received !== expected) {
      throw new Error(`Expected ${received} to be ${expected}`);
    }
  },
  toBeDefined: () => {
    if (received === undefined) throw new Error('Expected value to be defined');
  },
  toBeGreaterThan: (value) => {
    if (!(received > value)) throw new Error(`Expected ${received} > ${value}`);
  },
  toMatch: (regex) => {
    if (typeof received !== 'string' || !new RegExp(regex).test(received)) {
      throw new Error(`Expected ${received} to match ${regex}`);
    }
  },
  toBeInstanceOf: (ctor) => {
    if (!(received instanceof ctor)) {
      throw new Error(`Expected value to be instance of ${ctor.name}`);
    }
  },
});

global.expect = (value) => makeExpect(value);

const testModulePath = path.join(
  outDir,
  'src',
  'conductor',
  'premium-routing',
  '__tests__',
  'premium-model-router.test.js',
);

const results = [];

const run = async () => {
  await import(url.pathToFileURL(testModulePath).href);

  for (const testCase of tests) {
    try {
      for (const hook of beforeEachHooks) {
        await hook();
      }
      await testCase.fn();
      results.push({ name: testCase.name, status: 'passed' });
    } catch (error) {
      results.push({ name: testCase.name, status: 'failed', error });
    }
  }

  for (const hook of afterAllHooks) {
    await hook();
  }

  const failed = results.filter((r) => r.status === 'failed');
  results.forEach((r) => {
    if (r.status === 'passed') {
      console.log(`✓ ${r.name}`);
    } else {
      console.error(`✗ ${r.name}`);
      console.error(r.error);
    }
  });

  if (failed.length > 0) {
    process.exit(1);
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
