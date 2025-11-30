import express from 'express';
import request from 'supertest';
import { correlationIdMiddleware } from '../../middleware/correlation-id.js';
import {
  appLogger,
  getRequestContext,
  requestContextMiddleware,
} from '../request-context.js';

describe('requestContextMiddleware', () => {
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

    const response = await request(app)
      .get('/health')
      .set('x-correlation-id', 'corr-test-123');

    expect(response.status).toBe(200);
    expect(response.body.correlationId).toBe('corr-test-123');
    expect(response.headers['x-correlation-id']).toBe('corr-test-123');
  });
});

