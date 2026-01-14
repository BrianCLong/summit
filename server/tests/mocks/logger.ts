import { jest } from '@jest/globals';

const logger = {
  child: jest.fn().mockReturnThis(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  silent: jest.fn(),
  level: 'silent',
};

export const correlationStorage = {
  getStore: jest.fn(),
  run: (_store: any, fn: Function) => fn(),
  enterWith: jest.fn(),
};

export { logger };
export default logger;
