import { EventEmitter } from 'events';
import type { Request, Response } from 'express';
import { jest } from '@jest/globals';

const mockLogger = {
  info: jest.fn(),
};

jest.mock('../../src/config/logger.js', () => ({
  logger: mockLogger,
}));

import { requestProfilingMiddleware } from '../../src/middleware/request-profiling.js';

describe('requestProfilingMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs request duration with route and status', () => {
    const req = {
      method: 'GET',
      path: '/test',
      baseUrl: '',
      route: { path: '/test' },
    } as Partial<Request>;
    const res = new EventEmitter() as any;
    res.statusCode = 200;
    // Removed recursive res.on

    const next = jest.fn();

    requestProfilingMiddleware(req as Request, res as Response, next);

    (res as unknown as EventEmitter).emit('finish');

    expect(next).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        route: '/test',
        status: 200,
        durationMs: expect.any(Number),
      }),
      'request completed',
    );
  });
});
