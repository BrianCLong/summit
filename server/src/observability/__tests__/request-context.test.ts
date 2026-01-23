import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { correlationIdMiddleware } from '../../middleware/correlation-id.js';
import {
  appLogger,
  getRequestContext,
  requestContextMiddleware,
} from '../request-context.js';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('requestContextMiddleware', () => {
  test('propagates correlation ID and exposes context to log mixins', async () => {
    const app = express();
    app.use(correlationIdMiddleware);
    app.use(requestContextMiddleware);

    app.get('/health', (req, res) => {
      const context = getRequestContext();
      appLogger.info({ message: 'test-log' });
      res.json({
        correlationId: req.correlationId,
        traceId: context?.traceId,
        spanId: context?.spanId,
      });
    });

    const server = app.listen(0, '127.0.0.1');
    try {
      const response = await request(server)
        .get('/health')
        .set('x-correlation-id', 'corr-test-123');

      expect(response.status).toBe(200);
      expect(response.body.correlationId).toBe('corr-test-123');
      expect(response.headers['x-correlation-id']).toBe('corr-test-123');
    } finally {
      server.close();
    }
  });
});
