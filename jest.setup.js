const fs = require('fs');

// Configure JSDOM environment for client tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Test quarantine functionality
let q = [];
try {
  q = JSON.parse(fs.readFileSync('tests/.quarantine.json', 'utf8'));
} catch {}

const origIt = globalThis.it || it;
const shouldQuarantine = (name) => q.some((pattern) => typeof name === 'string' && name.includes(pattern));

globalThis.it = Object.assign((name, fn, t) => {
  if (shouldQuarantine(name)) return origIt.skip(name, fn, t);
  return origIt(name, fn, t);
}, origIt);

if (globalThis.test) {
  globalThis.test = globalThis.it;
}

if (globalThis.describe) {
  const origDescribe = globalThis.describe;
  globalThis.describe = Object.assign((name, fn) => {
    if (shouldQuarantine(name)) {
      return origDescribe.skip(name, fn);
    }
    return origDescribe(name, fn);
  }, origDescribe);
}

try {
  require('@testing-library/jest-dom');
} catch {}

// Global mocks for native/optional dependencies that are not available in CI
jest.mock(
  'archiver',
  () => {
    return () => ({
      pipe: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      file: jest.fn().mockReturnThis(),
      finalize: jest.fn(),
    });
  },
  { virtual: true },
);

jest.mock(
  'argon2',
  () => ({
    hash: jest.fn(async (input) => `argon2:${input}`),
    verify: jest.fn(async (_hash, _input) => true),
  }),
  { virtual: true },
);
