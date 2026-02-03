import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.unstable_mockModule('../../services/ticket-links.js', () => ({
  addTicketRunLink: jest.fn(),
  addTicketDeploymentLink: jest.fn(),
  extractTicketFromPR: jest.fn(),
}));

jest.unstable_mockModule('../../services/lifecycle-listeners.js', () => ({
  LifecycleManager: {
    emitRunEvent: jest.fn(),
    emitDeploymentEvent: jest.fn(),
  },
}));

jest.unstable_mockModule('../../webhooks/webhook.service.js', () => ({
  webhookService: {
    createWebhook: jest.fn(),
    getWebhooks: jest.fn(),
    getWebhook: jest.fn(),
    updateWebhook: jest.fn(),
    deleteWebhook: jest.fn(),
    getDeliveries: jest.fn(),
    triggerEvent: jest.fn(),
  },
  CreateWebhookSchema: { parse: (x: any) => x },
  UpdateWebhookSchema: { parse: (x: any) => x },
}));

// Mock observability to avoid errors during import
jest.unstable_mockModule('../../observability/index.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
  metrics: {
    incrementCounter: jest.fn(),
  },
  tracer: {
    trace: jest.fn((name, fn) => fn({
      setStatus: jest.fn(),
      setAttributes: jest.fn(),
      recordException: jest.fn(),
    })),
  },
}));

describe('Webhooks Security', () => {
  let app: express.Express;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    originalEnv = { ...process.env };

    // Simulate Production
    process.env.NODE_ENV = 'production';
    // Ensure secrets are unset
    delete process.env.JIRA_WEBHOOK_SECRET;
    delete process.env.LIFECYCLE_WEBHOOK_SECRET;

    // Dynamic import to apply mocks and env vars
    const webhooksRouter = (await import('../webhooks.js')).default;

    app = express();
    app.use(express.json());
    app.use('/api/webhooks', webhooksRouter);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should reject Jira webhook when secret is missing in production', async () => {
    const res = await request(app)
      .post('/api/webhooks/jira')
      .send({
        webhookEvent: 'jira:issue_created',
        issue: { key: 'TEST-123' }
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Server configuration error' });
  });

  it('should reject Lifecycle webhook when secret is missing in production', async () => {
    const res = await request(app)
      .post('/api/webhooks/lifecycle')
      .send({
        event_type: 'run_created',
        id: '123'
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Server configuration error' });
  });
});
