// Global test setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-for-safety';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock console.error to avoid noise but allow it to be spied on without throwing
// unless we want to enforce no console.error
const originalConsoleError = console.error;
console.error = (...args) => {
  // originalConsoleError(...args); // Uncomment to see errors
};
