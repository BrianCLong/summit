import { logger, getRequestLogger } from '../logging/logger.js';
import { context } from '../context.js';
import { jest } from '@jest/globals';

// Mock the underlying pino logger
jest.mock('../../config/logger.js', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };
  return {
    logger: mockLogger,
    default: mockLogger,
  };
});

import { logger as baseLogger } from '../../config/logger.js';

describe('Observability Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log without context', () => {
    logger.info('test message');
    expect(baseLogger.info).toHaveBeenCalledWith({}, 'test message');
  });

  it('should inject context into logs', () => {
    context.run({ correlationId: '123', tenantId: 'abc' }, () => {
      logger.info('contextual message');
      expect(baseLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: '123',
          tenantId: 'abc',
        }),
        'contextual message'
      );
    });
  });

  it('should merge user meta with context', () => {
    context.run({ correlationId: '123' }, () => {
      logger.info('message', { custom: 'data' });
      expect(baseLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: '123',
          custom: 'data',
        }),
        'message'
      );
    });
  });
});
