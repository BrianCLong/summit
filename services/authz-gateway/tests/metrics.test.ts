import { afterAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/index';
import {
  stopObservability,
  recordGraphqlDuration,
  recordErrorRate,
  recordIngestEvent,
} from '../src/observability';

describe('metrics', () => {
  afterAll(async () => {
    await stopObservability();
  });

  it('exposes prometheus metrics', async () => {
    const app = await createApp();
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });

  it('emits OTEL-backed custom metrics with tenant labels', async () => {
    const app = await createApp();
    recordGraphqlDuration(250, 'tenant-alpha', 'testOperation');
    recordErrorRate('tenant-alpha', 502);
    recordIngestEvent('tenant-alpha', 'allow');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('graphql_request_duration_bucket');
    expect(res.text).toContain('tenant="tenant-alpha"');
    expect(res.text).toContain('operation="testOperation"');
    expect(res.text).toContain('error_rate{');
    expect(res.text).toContain('ingest_events_processed{');
  });
});
