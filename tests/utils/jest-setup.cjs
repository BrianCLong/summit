/**
 * Jest Global Setup
 *
 * This file is run before each test file.
 * It sets up global test utilities and configuration.
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const flakeRegistryPath = path.resolve(process.cwd(), '.github', 'flake-registry.yml');
const flakeEncountersPath = process.env.FLAKE_ENCOUNTERS_PATH
  ? path.resolve(process.env.FLAKE_ENCOUNTERS_PATH)
  : path.resolve(process.cwd(), 'artifacts', 'flake', 'flake-encounters.jsonl');

let flakeRegistryCache = null;

function loadFlakeRegistry() {
  if (flakeRegistryCache) {
    return flakeRegistryCache;
  }
  if (!fs.existsSync(flakeRegistryPath)) {
    flakeRegistryCache = { flakes: [] };
    return flakeRegistryCache;
  }
  const content = fs.readFileSync(flakeRegistryPath, 'utf8');
  flakeRegistryCache = yaml.load(content);
  return flakeRegistryCache;
}

function getFlakeEntry(id) {
  const registry = loadFlakeRegistry();
  if (!registry || !Array.isArray(registry.flakes)) {
    return null;
  }
  return registry.flakes.find((flake) => flake.id === id) || null;
}

function recordFlakeEncounter(entry, testName, error) {
  const payload = {
    id: entry.id,
    scope: entry.scope,
    target: entry.target,
    occurred_at: new Date().toISOString(),
    test_name: testName,
    error: error && error.message ? String(error.message).slice(0, 200) : undefined,
  };
  fs.mkdirSync(path.dirname(flakeEncountersPath), { recursive: true });
  fs.appendFileSync(flakeEncountersPath, `${JSON.stringify(payload)}\n`, 'utf8');
}

// Extend Jest timeout for integration tests
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

// Wait for a condition to be true
globalThis.testHelpers = {
  waitFor: async function(fn, timeout) {
    timeout = timeout || 5000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = await fn();
      if (result) return;
      await new Promise(function(resolve) { setTimeout(resolve, 100); });
    }
    throw new Error('waitFor timed out after ' + timeout + 'ms');
  },

  sleep: function(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  },

  mockConsole: function() {
    const originalConsole = Object.assign({}, console);
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();

    return {
      restore: function() {
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.info = originalConsole.info;
        console.debug = originalConsole.debug;
      },
    };
  },
};

globalThis.quarantinedTest = function(id, name, fn, timeout) {
  const entry = getFlakeEntry(id);
  if (!entry) {
    throw new Error(`Quarantined test ${name} must reference valid flake id ${id}.`);
  }
  if (!['unit-test', 'integration-test'].includes(entry.scope)) {
    throw new Error(`Flake id ${id} is not scoped for tests.`);
  }
  const expectedTargets = new Set([name, `jest:${name}`]);
  if (!expectedTargets.has(entry.target)) {
    throw new Error(`Flake id ${id} target mismatch. Expected one of: ${Array.from(expectedTargets).join(', ')}`);
  }

  return test(
    `[flake:${id}] ${name}`,
    async () => {
      try {
        await fn();
      } catch (error) {
        recordFlakeEncounter(entry, name, error);
        await fn();
      }
    },
    timeout,
  );
};

globalThis.quarantinedIt = globalThis.quarantinedTest;

// Clean up after each test
afterEach(function() {
  jest.clearAllMocks();
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', function(reason, promise) {
  console.error('Unhandled Rejection in test:', reason);
});

// Suppress specific warnings in tests
const originalWarn = console.warn;
console.warn = function() {
  const args = Array.prototype.slice.call(arguments);
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('Warning: ReactDOM.render is no longer supported')) return;
    if (message.includes('Warning: An update to')) return;
  }
  originalWarn.apply(console, args);
};
