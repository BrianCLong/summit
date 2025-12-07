// Mock factories for external services

export const createMockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
});

export const createMockRedis = () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
});

export const createMockNeo4jSession = () => ({
  run: jest.fn().mockResolvedValue({ records: [] }),
  close: jest.fn(),
});

export const createMockNeo4jDriver = () => ({
  session: jest.fn(() => createMockNeo4jSession()),
  close: jest.fn(),
});
