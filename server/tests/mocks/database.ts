import { jest } from '@jest/globals';

export const mockSession = {
  run: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined as never),
};

export const mockDriver = {
  session: jest.fn(() => mockSession),
};

export const getNeo4jDriver = () => mockDriver;
