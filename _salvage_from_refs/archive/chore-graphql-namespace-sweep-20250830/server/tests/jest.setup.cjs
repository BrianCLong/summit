const seedrandom = require('seedrandom');

beforeAll(() => {
  // Fixed system time for deterministic timestamps
  jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
  // Deterministic RNG
  Math.random = seedrandom('intelgraph-seed');
});

afterAll(() => {
  jest.useRealTimers();
});

// Optional: capture GraphQL operation bodies during tests to aid safelisting
try {
  const fs = require('fs');
  const path = require('path');
  const { ApolloServer } = require('@apollo/server');
  const orig = ApolloServer.prototype.executeOperation;
  const CAPTURE = process.env.CAPTURE_OPS === '1';
  const ART_DIR = path.resolve(process.cwd(), 'artifacts');
  const OUT = path.join(ART_DIR, 'graphql-ops.json');
  if (CAPTURE && orig) {
    if (!fs.existsSync(ART_DIR)) fs.mkdirSync(ART_DIR, { recursive: true });
    ApolloServer.prototype.executeOperation = async function (request, ...rest) {
      try {
        const q = (request && request.query) || (request && request.request && request.request.query);
        if (q) {
          let arr = [];
          try { arr = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
          if (!arr.includes(q)) { arr.push(q); fs.writeFileSync(OUT, JSON.stringify(arr, null, 2)); }
        }
      } catch {}
      return await orig.apply(this, [request, ...rest]);
    };
  }
} catch {}
