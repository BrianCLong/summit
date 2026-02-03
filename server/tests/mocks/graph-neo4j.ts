import { jest } from '@jest/globals';

// Mock session
export const mockSession = {
  run: jest.fn().mockResolvedValue({ records: [] }),
  close: jest.fn().mockResolvedValue(undefined as never),
  beginTransaction: jest.fn().mockReturnValue({
    run: jest.fn().mockResolvedValue({ records: [] }),
    commit: jest.fn().mockResolvedValue(undefined as never),
    rollback: jest.fn().mockResolvedValue(undefined as never),
  }),
};

// Mock driver
export const mockDriver = {
  session: jest.fn().mockReturnValue(mockSession),
  close: jest.fn().mockResolvedValue(undefined as never),
  verifyConnectivity: jest.fn().mockResolvedValue(undefined as never),
};

// Exported functions
export const getDriver = jest.fn().mockReturnValue(mockDriver);
export const runCypher = jest.fn().mockResolvedValue([]);
export const runQuery = jest.fn().mockResolvedValue([]);
export const initDriver = jest.fn().mockResolvedValue(mockDriver);
export const closeDriver = jest.fn().mockResolvedValue(undefined as never);

// Cache related
export const invalidateGraphQueryCache = jest.fn();
export const recordCacheBypass = jest.fn();
export const runWithGraphQueryCache = jest.fn().mockImplementation(
  async (_key: string, fn: () => Promise<unknown>) => fn()
);

export default {
  getDriver,
  runCypher,
  runQuery,
  initDriver,
  closeDriver,
  mockDriver,
  mockSession,
  invalidateGraphQueryCache,
  recordCacheBypass,
  runWithGraphQueryCache,
};
