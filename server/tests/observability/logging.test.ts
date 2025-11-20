import express from 'express';
import request from 'supertest';
import pino from 'pino';
import { Writable } from 'stream';
import { context } from '../../src/logging/context';
import { logger, pinoOptions } from '../../src/logging/logger';
import { loggingMiddleware } from '../../src/logging/middleware';
import { getErrorTracker } from '../../src/logging/error-tracking';

describe('Logging & Context', () => {
  describe('Context Storage', () => {
    it('should store and retrieve values within a run block', () => {
      const testContext = {
        correlationId: 'test-correlation-id',
        requestId: 'test-request-id',
        traceId: 'test-trace-id',
      };

      context.run(testContext, () => {
        expect(context.get()).toEqual(testContext);
        expect(context.getCorrelationId()).toBe('test-correlation-id');
      });

      expect(context.get()).toBeUndefined();
    });

    it('should handle nested contexts correctly', () => {
      const parentContext = {
        correlationId: 'parent',
        requestId: 'parent-req',
      };

      const childContext = {
        correlationId: 'child',
        requestId: 'child-req',
      };

      context.run(parentContext, () => {
        expect(context.getCorrelationId()).toBe('parent');

        context.run(childContext, () => {
          expect(context.getCorrelationId()).toBe('child');
        });

        expect(context.getCorrelationId()).toBe('parent');
      });
    });
  });


  describe('Error Tracking', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return LocalErrorTracker when SENTRY_DSN is not set', () => {
      delete process.env.SENTRY_DSN;
      const tracker = getErrorTracker();
      expect(tracker.constructor.name).toBe('LocalErrorTracker');
    });

    it('should return SentryErrorTracker when SENTRY_DSN is set', () => {
      process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
      const tracker = getErrorTracker();
      expect(tracker.constructor.name).toBe('SentryErrorTracker');
    });
  });

  describe('Logging Middleware', () => {
    it('should initialize context and set headers', async () => {
      const app = express();
      app.use(loggingMiddleware);
      app.get('/test', (req, res) => {
        const currentContext = context.get();
        res.json({
          correlationId: currentContext?.correlationId,
          traceId: currentContext?.traceId,
          reqCorrelationId: req.correlationId,
        });
      });

      const response = await request(app)
        .get('/test')
        .set('x-correlation-id', 'input-correlation-id')
        .set('x-trace-id', 'input-trace-id');

      expect(response.status).toBe(200);
      expect(response.body.correlationId).toBe('input-correlation-id');
      expect(response.body.traceId).toBe('input-trace-id');
      expect(response.body.reqCorrelationId).toBe('input-correlation-id');

      // Check response headers
      expect(response.headers['x-correlation-id']).toBe('input-correlation-id');
      expect(response.headers['x-trace-id']).toBe('input-trace-id');
    });

    it('should generate IDs if not provided', async () => {
      const app = express();
      app.use(loggingMiddleware);
      app.get('/test', (req, res) => {
        const currentContext = context.get();
        res.json({
          correlationId: currentContext?.correlationId,
          traceId: currentContext?.traceId,
        });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.correlationId).toBeDefined();
      expect(response.body.traceId).toBeDefined();
      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });
});
