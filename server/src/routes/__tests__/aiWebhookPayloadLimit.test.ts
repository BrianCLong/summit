import express from 'express';
import request from 'supertest';
import crypto from 'crypto';

const SECRET = 'test-secret';

describe('AI webhook payload limits', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ML_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.ML_WEBHOOK_SECRET;
  });

  function buildApp() {
    const { default: aiWebhook } = require('../aiWebhook');
    const app = express();

    app.use(
      express.json({
        limit: '2mb',
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        },
      }),
    );

    app.use((req, _res, next) => {
      (req as any).db = {
        jobs: { update: jest.fn().mockResolvedValue(null) },
        insights: { insert: jest.fn().mockResolvedValue({}) },
        audit: { insert: jest.fn().mockResolvedValue(null) },
      };
      next();
    });

    app.use(aiWebhook);
    return app;
  }

  function signPayload(body: string) {
    return crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  }

  it('rejects webhook payloads larger than 512KB with a 413 response', async () => {
    const app = buildApp();
    const oversizedPayload = {
      job_id: 'job-123',
      kind: 'nlp_entities',
      data: 'x'.repeat(600 * 1024),
    };
    const raw = JSON.stringify(oversizedPayload);
    const signature = signPayload(raw);

    const response = await request(app)
      .post('/ai/webhook')
      .set('X-IntelGraph-Signature', signature)
      .send(oversizedPayload);

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('Payload too large');
  });
});
