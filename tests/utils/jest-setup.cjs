// Global Jest setup for all test suites
// This file is loaded after the test environment is set up

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Suppress console warnings during tests (optional)
// const originalWarn = console.warn;
// console.warn = (...args) => {
//   if (args[0]?.includes('expected string')) return;
//   originalWarn(...args);
// };
