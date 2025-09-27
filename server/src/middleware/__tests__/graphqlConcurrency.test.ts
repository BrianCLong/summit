import express from 'express';
import request from 'supertest';
import { createGraphQLConcurrencyMiddleware } from '../graphqlConcurrency';

describe('GraphQL concurrency middleware', () => {
  const createApp = (service: any) => {
    const app = express();
    app.use((req, _res, next) => {
      (req as any).user = { id: 'user-1' };
      next();
    });
    app.post('/graphql', createGraphQLConcurrencyMiddleware({ service }), (_req, res) => {
      res.json({ ok: true });
    });
    return app;
  };

  it('allows requests when slots are available and releases after completion', async () => {
    const service = {
      acquire: jest.fn().mockResolvedValue({ allowed: true, limit: 2, active: 1 }),
      release: jest.fn().mockResolvedValue(0),
    };

    const app = createApp(service);
    const response = await request(app).post('/graphql');

    expect(response.status).toBe(200);
    expect(service.acquire).toHaveBeenCalledWith('user-1');
    expect(service.release).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when the limit is exceeded', async () => {
    const service = {
      acquire: jest.fn().mockResolvedValue({ allowed: false, limit: 1, active: 1 }),
      release: jest.fn(),
    };

    const app = createApp(service);
    const response = await request(app).post('/graphql');

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('1');
    expect(response.body.error).toBe('too_many_requests');
    expect(service.release).not.toHaveBeenCalled();
  });
});
