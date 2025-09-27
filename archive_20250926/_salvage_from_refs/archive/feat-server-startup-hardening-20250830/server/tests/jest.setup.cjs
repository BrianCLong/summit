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

