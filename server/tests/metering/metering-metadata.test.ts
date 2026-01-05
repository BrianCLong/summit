import { describe, it, expect, jest } from '@jest/globals';
import { EventEmitter } from 'events';
jest.mock('../../src/metering/emitter.js', () => ({
  meteringEmitter: {
    emitApiRequest: jest.fn().mockResolvedValue(undefined),
  },
}));

import { requestMeteringMiddleware } from '../../src/metering/middleware.js';

const { meteringEmitter } = jest.requireMock('../../src/metering/emitter.js') as {
  meteringEmitter: { emitApiRequest: jest.Mock };
};

describe('Metering metadata correctness', () => {
  it('emits required metadata for API request meters', async () => {
    const req: any = {
      method: 'GET',
      path: '/api/health',
      user: { tenantId: 'tenant-123' },
    };
    const res: any = new EventEmitter();
    res.statusCode = 200;
    res.setHeader = jest.fn();

    const next = jest.fn();

    requestMeteringMiddleware(req, res, next);
    res.emit('finish');

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedEmitter.emitApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-123',
        source: 'api-middleware',
        method: 'GET',
        endpoint: '/api/health',
        statusCode: 200,
        metadata: expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      }),
    );
  });
});
