import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import crypto from 'crypto';
import request from 'supertest';
import aiWebhook from '../../routes/aiWebhook.js';
import { resetRateLimitStore } from '../rateLimit.js';
import { RateLimitConfig, setRateLimitConfig } from '../../config/rateLimit.js';

jest.mock('../../realtime/pubsub.js', () => ({
  pubsub: { publish: jest.fn() },
}));

const SECRET = 'test-secret';

function buildApp() {
  process.env.ML_WEBHOOK_SECRET = SECRET;
  const app = express();

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use((req, _res, next) => {
    (req as any).db = {
      jobs: { update: jest.fn().mockResolvedValue(undefined) },
      insights: { insert: jest.fn().mockResolvedValue({ id: 'insight' }) },
      audit: { insert: jest.fn().mockResolvedValue(undefined) },
    };
    next();
  });

  app.use(aiWebhook);
  return app;
}

function sign(body: any) {
  const raw = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  return { raw, sig };
}

function enableRateLimit(config?: Partial<RateLimitConfig>) {
  setRateLimitConfig({
    enabled: true,
    store: 'memory',
    groups: {
      default: { limit: 100, windowMs: 60_000 },
      webhookIngest: { limit: 2, windowMs: 1_000 },
    },
    ...config,
  } as RateLimitConfig);
  resetRateLimitStore();
}

const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? describe : describe.skip;

describeIf('AI webhook rate limiting', () => {
  beforeEach(() => {
    enableRateLimit();
  });

  afterEach(() => {
    resetRateLimitStore();
  });

  it('allows traffic under the configured limit', async () => {
    const app = buildApp();
    const body = { job_id: 'job-1', kind: 'nlp_entities', results: [] };
    const { sig } = sign(body);

    const res = await request(app)
      .post('/ai/webhook')
      .set('X-IntelGraph-Signature', sig)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBe('2');
    expect(res.body.ok).toBe(true);
  });

  it('returns 429 with retry headers once the limit is exceeded', async () => {
    const app = buildApp();
    const body = { job_id: 'job-2', kind: 'nlp_entities', results: [] };
    const { sig } = sign(body);

    await request(app)
      .post('/ai/webhook')
      .set('X-IntelGraph-Signature', sig)
      .send(body);

    await request(app)
      .post('/ai/webhook')
      .set('X-IntelGraph-Signature', sig)
      .send(body);

    const blocked = await request(app)
      .post('/ai/webhook')
      .set('X-IntelGraph-Signature', sig)
      .send(body);

    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('honors the feature flag and skips limiting when disabled', async () => {
    setRateLimitConfig({
      enabled: false,
      store: 'memory',
      groups: {
        default: { limit: 1, windowMs: 1_000 },
        webhookIngest: { limit: 1, windowMs: 1_000 },
      },
    });
    resetRateLimitStore();

    const app = buildApp();
    const body = { job_id: 'job-3', kind: 'nlp_entities', results: [] };
    const { sig } = sign(body);

    const first = await request(app)
      .post('/ai/webhook')
      .set('X-IntelGraph-Signature', sig)
      .send(body);
    const second = await request(app)
      .post('/ai/webhook')
      .set('X-IntelGraph-Signature', sig)
      .send(body);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });
});
