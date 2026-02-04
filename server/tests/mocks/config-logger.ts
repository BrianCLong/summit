
console.log('DEBUG: config-logger.ts LOADED');
import { jest } from '@jest/globals';

export const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
    trace: jest.fn(),
    fatal: jest.fn(),
    silent: jest.fn(),
    level: 'debug',
} as any;

export const correlationStorage = {
    getStore: jest.fn(),
    run: jest.fn((store: any, cb: any) => cb()),
    enterWith: jest.fn(),
} as any;

export default logger;
