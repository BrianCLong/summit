import { jest } from '@jest/globals';

export const createPool = jest.fn().mockReturnValue({
  query: jest.fn().mockResolvedValue([[], []]),
  execute: jest.fn().mockResolvedValue([[], []]),
  getConnection: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue([[], []]),
    release: jest.fn(),
  }),
  end: jest.fn().mockResolvedValue(undefined),
});

export const createConnection = jest.fn().mockResolvedValue({
  query: jest.fn().mockResolvedValue([[], []]),
  execute: jest.fn().mockResolvedValue([[], []]),
  end: jest.fn().mockResolvedValue(undefined),
});

export default { createPool, createConnection };
