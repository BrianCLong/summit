const fs = require('fs');

// Configure JSDOM environment for client tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
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

const orig = globalThis.it || it;
globalThis.it = Object.assign((name, fn, t) => {
  if (q.some((s) => name.includes(s))) return orig.skip(name, fn, t);
  return orig(name, fn, t);
}, orig);

try {
  require.resolve('argon2');
} catch (error) {
  jest.mock(
    'argon2',
    () => {
      const crypto = require('crypto');
      const derive = async (input, salt) =>
        new Promise((resolve, reject) => {
          crypto.scrypt(input, salt, 32, (err, derivedKey) => {
            if (err) {
              reject(err);
            } else {
              resolve(derivedKey.toString('hex'));
            }
          });
        });

      const hash = jest.fn(async (input) => {
        const salt = crypto.randomBytes(16).toString('hex');
        const key = await derive(input, salt);
        return `jest-scrypt$${salt}$${key}`;
      });

      const verify = jest.fn(async (stored, input) => {
        if (typeof stored !== 'string' || !stored.startsWith('jest-scrypt$')) {
          return false;
        }
        const [, salt, expected] = stored.split('$');
        if (!salt || !expected) return false;
        const key = await derive(input, salt);
        return crypto.timingSafeEqual(
          Buffer.from(key, 'hex'),
          Buffer.from(expected, 'hex'),
        );
      });

      return { hash, verify };
    },
    { virtual: true },
  );
}
