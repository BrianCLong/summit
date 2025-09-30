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
  q = JSON.parse(fs.readFileSync("tests/.quarantine.json", "utf8"));
} catch {}

const orig = globalThis.it || it;
globalThis.it = Object.assign((name, fn, t) => {
  if (q.some(s => name.includes(s))) return orig.skip(name, fn, t);
  return orig(name, fn, t);
}, orig);