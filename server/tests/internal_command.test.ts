import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Use unstable_mockModule for ESM mocking
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, res: any, next: any) => {
    req.user = { id: 'test', role: 'admin' };
    next();
  },
  ensureRole: () => (req: any, res: any, next: any) => next(),
}));

describe('Internal Command Dashboard Endpoints', () => {
  let app: any;
  let internalCommandRouter: any;

  beforeEach(async () => {
    // Dynamic import to ensure mock is used
    const module = await import('../src/routes/internal-command.js');
    internalCommandRouter = module.default;

    app = express();
    app.use(express.json());
    app.use('/api/internal', internalCommandRouter);
  });

  const endpoints = [
    'governance',
    'agents',
    'ci',
    'releases',
    'zk',
    'streaming',
    'ga'
  ];

  endpoints.forEach(endpoint => {
    it(`should return status for ${endpoint}`, async () => {
      const res = await request(app).get(`/api/internal/${endpoint}/status`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('details');
      const status = res.body.status;
      expect(['green', 'yellow', 'red'].includes(status)).toBe(true);
    });
  });
});
