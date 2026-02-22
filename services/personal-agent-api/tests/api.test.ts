import { buildApp } from '../src/app';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';

describe('Personal Agent API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('should return health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/healthz'
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('should queue an agent run with envelope', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/agent/run',
      payload: {
        meta: {
          schema: "https://summit.dev/schemas/envelope.v0.1.json",
          tenant_id: "t_123",
          correlation_id: "c_abc",
          ts: new Date().toISOString()
        },
        payload: {
          type: 'alert_triage',
          input_ref: { kind: 'alert', id: 'alert_123' },
          constraints: { mode: 'assist' }
        }
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('run_id');
    expect(body.status).toBe('queued');
    expect(body.meta.tenant_id).toBe('t_123');
  });

  it('should queue a playbook run with envelope', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/agent/run-playbook',
      payload: {
        meta: {
          schema: "https://summit.dev/schemas/envelope.v0.1.json",
          tenant_id: "t_456",
          correlation_id: "c_def",
          ts: new Date().toISOString()
        },
        payload: {
          playbook: 'phishing_triage_v2',
          params: { alert_id: 'alert_123' }
        }
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('run_id');
    expect(body.meta.tenant_id).toBe('t_456');
  });

  it('should fetch run details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/runs/run_test_123'
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.run_id).toBe('run_test_123');
    expect(body.status).toBe('completed');
  });
});
