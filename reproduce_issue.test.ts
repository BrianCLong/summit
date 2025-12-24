
import express from 'express';
import request from 'supertest';
import { ipWhitelist, createRateLimiter } from './server/src/middleware/security';

describe('Trust Proxy Misconfiguration', () => {
  let app;

  beforeEach(() => {
    app = express();
    // Simulate production environment (usually this is set via NODE_ENV)
    // but for Express, default trust proxy is false.

    // Intentionally NOT setting 'trust proxy' here to demonstrate the issue
    // app.set('trust proxy', 1);

    // Middleware that relies on IP
    app.use('/admin', ipWhitelist(['10.0.0.1']));

    app.get('/admin', (req, res) => {
      res.status(200).send('Admin Access Granted');
    });

    app.get('/ip', (req, res) => {
        res.send(req.ip);
    });
  });

  it('should ignore X-Forwarded-For when trust proxy is not set', async () => {
    // In a real scenario, the load balancer (LB) sends the request.
    // The LB's IP is the remote address (e.g., 192.168.1.1).
    // The client's IP is in X-Forwarded-For (e.g., 10.0.0.1).

    // If we whitelist 10.0.0.1, we expect access to be granted if the header is trusted.
    // If not trusted, req.ip will be ::ffff:127.0.0.1 (local supertest) or the connection IP.

    const res = await request(app)
      .get('/admin')
      .set('X-Forwarded-For', '10.0.0.1'); // The whitelisted IP

    // Should FAIL (403) because req.ip is not taken from X-Forwarded-For
    expect(res.status).toBe(403);
  });

  it('should return the connection IP instead of the forwarded IP', async () => {
      const res = await request(app)
        .get('/ip')
        .set('X-Forwarded-For', '123.123.123.123');

      // Should NOT be the forwarded IP
      expect(res.text).not.toBe('123.123.123.123');
  });
});
