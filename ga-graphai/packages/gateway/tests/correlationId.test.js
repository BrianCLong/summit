import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';

class RecordingLedger {
  constructor() {
    this.recordedPayloads = [];
  }

  record(payload) {
    this.recordedPayloads.push(payload);
    return { id: `evidence-${this.recordedPayloads.length}`, ...payload };
  }
}

test('generates and propagates a correlation id when missing', async () => {
  const ledger = new RecordingLedger();
  const { app } = createApp({ ledger });

  const response = await request(app)
    .post('/v1/plan')
    .set('x-tenant', 'acme-corp')
    .set('x-purpose', 'investigation')
    .send({ objective: 'derive correlation id' });

  assert.equal(response.status, 200);
  const headerValue = response.headers['x-correlation-id'];
  assert.ok(headerValue);
  assert.match(headerValue, /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  assert.equal(ledger.recordedPayloads[0]?.correlationId, headerValue);
});

test('preserves incoming correlation id and forwards to provenance payload', async () => {
  const ledger = new RecordingLedger();
  const { app } = createApp({ ledger });
  const correlationId = 'corr-fixed-id';

  const response = await request(app)
    .post('/v1/generate')
    .set('x-tenant', 'acme-corp')
    .set('x-purpose', 'investigation')
    .set('X-Correlation-Id', correlationId)
    .send({ objective: 'reuse correlation id' });

  assert.equal(response.status, 200);
  assert.equal(response.headers['x-correlation-id'], correlationId);
  assert.equal(ledger.recordedPayloads[0]?.correlationId, correlationId);
});
