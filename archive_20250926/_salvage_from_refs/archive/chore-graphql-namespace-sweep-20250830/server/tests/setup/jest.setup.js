/**
 * Jest Global Setup Configuration
 * Provides common test utilities and matchers
 */

console.log('jest.setup.js loaded');

// Extend Jest with additional matchers from jest-extended
require('jest-extended');

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests unless debugging
const originalConsole = { ...console };

beforeAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
    // Keep console.error for debugging test failures
  }
});

afterAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  }
});

// Global test utilities
global.testUtils = {
  // Wait for condition with timeout
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) return true;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  // Generate test IDs
  generateId: (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Mock data generators
  mockEntity: (overrides = {}) => ({
    id: global.testUtils.generateId('entity'),
    type: 'TEST_ENTITY',
    label: 'Test Entity',
    props: { name: 'Test Entity', description: 'A test entity' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }),
  
  mockRelationship: (overrides = {}) => ({
    id: global.testUtils.generateId('rel'),
    from: global.testUtils.generateId('from'),
    to: global.testUtils.generateId('to'),
    type: 'TEST_RELATIONSHIP',
    props: { confidence: 0.8, source: 'test' },
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  mockUser: (overrides = {}) => ({
    id: global.testUtils.generateId('user'),
    email: `test_${Date.now()}@example.com`,
    name: 'Test User',
    role: 'analyst',
    createdAt: new Date().toISOString(),
    ...overrides
  })
};

// Error handling for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// --- Heavy external stubs to keep CI green without services ---
// fluent-ffmpeg: provide a chainable stub that triggers callbacks upon run()
jest.mock('fluent-ffmpeg', () => {
  const handlers = {};
  const chain = {
    seekInput: jest.fn(() => chain),
    duration: jest.fn(() => chain),
    fps: jest.fn(() => chain),
    addOption: jest.fn(() => chain),
    output: jest.fn(() => chain),
    noVideo: jest.fn(() => chain),
    audioCodec: jest.fn(() => chain),
    on: jest.fn((ev, cb) => { handlers[ev] = cb; return chain; }),
    run: jest.fn(() => {
      if (handlers['filenames']) handlers['filenames'](['frame-1.png']);
      if (handlers['end']) handlers['end']();
    }),
  };
  const ffmpeg = jest.fn(() => chain);
  ffmpeg.setFfmpegPath = jest.fn();
  ffmpeg.setFfprobePath = jest.fn();
  ffmpeg.ffprobe = jest.fn((_vp, cb) => cb(null, { format: { duration: 0 } }));
  return ffmpeg;
});

// python-shell: deterministic OK result
jest.mock('python-shell', () => ({
  PythonShell: {
    run: (_file, _opts, cb) => cb(null, 'OK'),
  },
}));

// Neo4j driver: stable singleton fake so tests can mutate run mocks
(() => {
  const path = require('path');
  const makeSession = () => ({ run: jest.fn().mockResolvedValue({ records: [] }), close: jest.fn() });
  const driver = { session: jest.fn(() => makeSession()), close: jest.fn() };
  const neoDbNoExt = path.resolve(__dirname, '../../src/db/neo4j');
  const neoDbTs = `${neoDbNoExt}.ts`;
  const neoGraphNoExt = path.resolve(__dirname, '../../src/graph/neo4j');
  const neoGraphTs = `${neoGraphNoExt}.ts`;
  const factoryDb = () => ({ getNeo4jDriver: () => driver });
  const factoryGraph = () => ({ getDriver: () => driver, runCypher: jest.fn().mockResolvedValue([]) });
  try { jest.mock(neoDbNoExt, factoryDb); } catch {}
  try { jest.mock(neoDbTs, factoryDb); } catch {}
  try { jest.mock(neoGraphNoExt, factoryGraph); } catch {}
  try { jest.mock(neoGraphTs, factoryGraph); } catch {}
})();
