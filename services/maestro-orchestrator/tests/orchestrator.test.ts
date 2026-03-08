import { buildApp } from '../src/app';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';

describe('Maestro Orchestrator', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('should orchestrate alert_triage', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/orchestrate',
      payload: {
        run_id: 'run_123',
        payload: {
          type: 'alert_triage',
          constraints: { mode: 'assist' }
        }
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.run_id).toBe('run_123');
    expect(body.status).toBe('orchestrating');
    expect(body.requires_hitl).toBe(false);
  });

  it('should deny non-alert_triage types', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/orchestrate',
      payload: {
        payload: {
          type: 'unknown_type'
        }
      }
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toBe('Policy Denied');
  });

  it('should flag HITL for autopilot', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/orchestrate',
      payload: {
        payload: {
          type: 'alert_triage',
          constraints: { mode: 'autopilot' }
        }
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().requires_hitl).toBe(true);
  });
});
