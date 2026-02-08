import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';

let router: typeof import('../executors-api.js').default;

if (!process.env.NO_NETWORK_LISTEN) {
  process.env.NO_NETWORK_LISTEN = 'true';
}
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('Executors API', () => {
  const app = express();

  beforeAll(async () => {
    ({ default: router } = await import(
      new URL('../executors-api.ts', import.meta.url).href
    ));
    app.use('/api/maestro/v1', router);
  });

  it('lists executors (empty)', async () => {
    const res = await request(app).get('/api/maestro/v1/executors').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
