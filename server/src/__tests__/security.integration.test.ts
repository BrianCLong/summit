import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import request from 'supertest';
import { expressValidationPipeline } from '../middleware/express-validation-pipeline.js';
import { createRedisRateLimiter } from '../middleware/redisRateLimiter.js';
import { sanitizeHtml } from '../utils/htmlSanitizer.js';

describe('Security middleware integration', () => {
  const allowedOrigins = ['http://allowed.test'];
  const buildApp = () => {
    const app = express();
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(
      (req, res, next) =>
        cors({
          origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            return allowedOrigins.includes(origin)
              ? callback(null, true)
              : callback(new Error('Origin not allowed'));
          },
          credentials: true,
        })(req, res, (err) => {
          if (err) return res.status(403).json({ error: err.message });
          next();
        }),
    );
    app.use(hpp());
    app.use(express.json());
    app.use(mongoSanitize({ replaceWith: '_' }));
    app.use(expressValidationPipeline);

    app.get('/echo', (req, res) => {
      res.json({ headers: req.headers, query: req.query, body: req.body });
    });

    app.post('/echo', (req, res) => {
      res.json({ headers: req.headers, query: req.query, body: req.body });
    });

    app.use(
      '/limited',
      createRedisRateLimiter({ windowMs: 50, max: 2, message: { error: 'limited' } }),
      (_req, res) => res.json({ ok: true }),
    );

    return app;
  };

  it('sets security headers via helmet', async () => {
    const response = await request(buildApp()).get('/echo');
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
  });

  it('allows only whitelisted origins', async () => {
    const app = buildApp();
    const allowed = await request(app).get('/echo').set('Origin', allowedOrigins[0]);
    expect(allowed.headers['access-control-allow-origin']).toBe(allowedOrigins[0]);

    const blocked = await request(app).get('/echo').set('Origin', 'http://evil.test');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toContain('not allowed');
  });

  it('sanitizes Mongo-style operators from payloads', async () => {
    const response = await request(buildApp())
      .post('/echo')
      .send({ name: 'safe', $where: 'malicious()' });
    expect(response.body.body).toEqual({ name: 'safe' });
  });

  it('collapses duplicated query params via hpp', async () => {
    const response = await request(buildApp()).get('/echo?role=admin&role=user');
    expect(response.body.query.role).toBe('admin');
  });

  it('sanitizes HTML using DOMPurify through express-validator pipeline', async () => {
    const dirty = "<img src=x onerror=alert('xss')>Hello";
    const response = await request(buildApp()).post('/echo').send({ bio: dirty });
    expect(response.body.body.bio).toBe('Hello');
    expect(sanitizeHtml(dirty)).toBe('Hello');
  });

  it('enforces Redis-backed rate limits', async () => {
    const app = buildApp();
    await request(app).get('/limited');
    await request(app).get('/limited');
    const limited = await request(app).get('/limited');
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe('limited');
  });
});
