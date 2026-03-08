import { buildApp } from '../src/app';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';

describe('Switchboard Webhooks', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('should normalize Splunk alert', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/splunk',
      payload: {
        sid: 'splunk_123',
        search_name: 'High CPU Usage',
        result: {
          severity: 'high',
          host: 'prod-web-01'
        }
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('accepted');
    expect(body.alert_id).toBe('splunk_123');
  });
});
