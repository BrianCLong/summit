import express from 'express';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../src/index';
import { TEST_API_KEY } from '../src/api-keys';
import { stopObservability } from '../src/observability';

const eventsPath = path.join(__dirname, 'fixtures', 'api-events.log');

let opaServer: Server;

beforeAll((done) => {
  const opa = express();
  opa.use(express.json());
  opa.post('/v1/data/summit/abac/decision', (_req, res) => {
    res.json({ result: { allow: true, reason: 'allow', obligations: [] } });
  });
  opaServer = opa.listen(0, () => {
    const port = (opaServer.address() as AddressInfo).port;
    process.env.OPA_URL = `http://localhost:${port}/v1/data/summit/abac/decision`;
    done();
  });
});

afterAll(async () => {
  opaServer.close();
  if (fs.existsSync(eventsPath)) {
    fs.unlinkSync(eventsPath);
  }
  await stopObservability();
});

beforeEach(() => {
  if (fs.existsSync(eventsPath)) {
    fs.unlinkSync(eventsPath);
  }
  process.env.API_EVENT_LOG = eventsPath;
  process.env.API_RATE_WINDOW_MS = '1000';
  process.env.API_QUOTA_WINDOW_MS = '60000';
});

afterEach(() => {
  delete process.env.API_EVENT_LOG;
  delete process.env.API_RATE_LIMIT;
  delete process.env.API_RATE_WINDOW_MS;
  delete process.env.API_QUOTA_LIMIT;
  delete process.env.API_QUOTA_WINDOW_MS;
});

describe('external decision API', () => {
  it('returns decision payloads with governance headers and audit trail', async () => {
    process.env.API_RATE_LIMIT = '5';
    process.env.API_QUOTA_LIMIT = '5';
    const app = await createApp();

    const res = await request(app)
      .post('/v1/companyos/decisions:check')
      .set('x-api-key', TEST_API_KEY)
      .send({ subject: { id: 'alice' }, action: 'dataset:read' });

    expect(res.status).toBe(200);
    expect(res.body.trace_id).toBeTruthy();
    expect(res.headers['x-ratelimit-limit']).toBe('5');
    expect(res.headers['x-quota-limit']).toBe('5');

    const events = fs
      .readFileSync(eventsPath, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(events[0].apiMethod).toBe('companyos.decisions.check');
    expect(events[0].statusCode).toBe(200);
  });

  it('enforces per-key rate limits', async () => {
    process.env.API_RATE_LIMIT = '1';
    process.env.API_QUOTA_LIMIT = '5';
    const app = await createApp();

    const first = await request(app)
      .post('/v1/companyos/decisions:check')
      .set('x-api-key', TEST_API_KEY)
      .send({ subject: { id: 'alice' }, action: 'dataset:read' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/v1/companyos/decisions:check')
      .set('x-api-key', TEST_API_KEY)
      .send({ subject: { id: 'alice' }, action: 'dataset:read' });

    expect(second.status).toBe(429);
    expect(second.body.error).toBe('rate_limit_exceeded');
    expect(second.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('enforces quotas with explicit headers', async () => {
    process.env.API_RATE_LIMIT = '5';
    process.env.API_QUOTA_LIMIT = '1';
    const app = await createApp();

    const first = await request(app)
      .post('/v1/companyos/decisions:check')
      .set('x-api-key', TEST_API_KEY)
      .send({ subject: { id: 'alice' }, action: 'dataset:read' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/v1/companyos/decisions:check')
      .set('x-api-key', TEST_API_KEY)
      .send({ subject: { id: 'alice' }, action: 'dataset:read' });

    expect(second.status).toBe(429);
    expect(second.body.error).toBe('quota_exhausted');
    expect(second.headers['x-quota-remaining']).toBe('0');
  });
});
