import express from 'express';
import request from 'supertest';
import { publicRateLimit, authenticatedRateLimit } from '../rateLimiter';

const app = express();
app.use('/public', publicRateLimit, (req, res) => res.status(200).send('Public OK'));

app.use('/authenticated', (req, res, next) => {
  (req as any).user = { id: 'test-user' };
  next();
}, authenticatedRateLimit, (req, res) => res.status(200).send('Authenticated OK'));

describe('Rate Limiting Middleware', () => {
  describe('Public Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      const response = await request(app).get('/public');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Public OK');
    });

    it('should block requests over the limit', async () => {
      // Exceed the rate limit
      for (let i = 0; i < 101; i++) {
        await request(app).get('/public');
      }
      const response = await request(app).get('/public');
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many public requests');
    });

    it('should set the correct rate limit headers', async () => {
      const response = await request(app).get('/public');
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Authenticated Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      const response = await request(app).get('/authenticated');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Authenticated OK');
    });

    it('should block requests over the limit', async () => {
      // Exceed the rate limit
      for (let i = 0; i < 1001; i++) {
        await request(app).get('/authenticated');
      }
      const response = await request(app).get('/authenticated');
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many authenticated requests');
    });

    it('should set the correct rate limit headers', async () => {
      const response = await request(app).get('/authenticated');
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});
