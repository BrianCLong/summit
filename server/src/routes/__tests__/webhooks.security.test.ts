
import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../services/ticket-links', () => ({
  addTicketRunLink: jest.fn(),
  addTicketDeploymentLink: jest.fn(),
  extractTicketFromPR: jest.fn(),
}));

jest.mock('../../services/lifecycle-listeners', () => ({
  LifecycleManager: {
    emitRunEvent: jest.fn(),
    emitDeploymentEvent: jest.fn(),
  },
}));

jest.mock('../../webhooks/webhook.service', () => ({
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

jest.mock('../../observability/index', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  metrics: {
    incrementCounter: jest.fn(),
  },
  tracer: {
    trace: jest.fn((name: string, fn: any) => fn({
        setAttributes: jest.fn(),
        setStatus: jest.fn(),
        recordException: jest.fn(),
    })),
  },
}));

// Import the router after mocks
import webhookRouter from '../webhooks';

describe('Webhook Security Tests', () => {
  let app: express.Application;
  const JIRA_SECRET = 'jira-secret-123';
  const LIFECYCLE_SECRET = 'lifecycle-secret-456';

  beforeAll(() => {
    process.env.JIRA_WEBHOOK_SECRET = JIRA_SECRET;
    process.env.LIFECYCLE_WEBHOOK_SECRET = LIFECYCLE_SECRET;
    process.env.NODE_ENV = 'test';

    app = express();
    app.use(express.json());
    app.use('/webhooks', webhookRouter);
  });

  afterAll(() => {
    delete process.env.JIRA_WEBHOOK_SECRET;
    delete process.env.LIFECYCLE_WEBHOOK_SECRET;
  });

  describe('Jira Webhook Verification', () => {
    it('should accept request with correct secret in query param', async () => {
      const response = await request(app)
        .post(`/webhooks/jira?secret=${JIRA_SECRET}`)
        .send({ webhookEvent: 'jira:issue_updated', issue: { key: 'TEST-1' } });

      expect(response.status).toBe(200);
    });

    it('should accept request with correct secret in header', async () => {
      const response = await request(app)
        .post('/webhooks/jira')
        .set('x-webhook-secret', JIRA_SECRET)
        .send({ webhookEvent: 'jira:issue_updated', issue: { key: 'TEST-1' } });

      expect(response.status).toBe(200);
    });

    it('should reject request with incorrect secret', async () => {
      const response = await request(app)
        .post('/webhooks/jira')
        .set('x-webhook-secret', 'wrong-secret')
        .send({ webhookEvent: 'jira:issue_updated', issue: { key: 'TEST-1' } });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid webhook secret');
    });

    it('should reject request with missing secret', async () => {
      const response = await request(app)
        .post('/webhooks/jira')
        .send({ webhookEvent: 'jira:issue_updated', issue: { key: 'TEST-1' } });

      expect(response.status).toBe(401);
    });
  });

  describe('Lifecycle Webhook Verification', () => {
    it('should accept request with correct secret in x-lifecycle-secret', async () => {
      const response = await request(app)
        .post('/webhooks/lifecycle')
        .set('x-lifecycle-secret', LIFECYCLE_SECRET)
        .send({ event_type: 'run_created', id: 'run-1' });

      expect(response.status).toBe(200);
    });

    it('should accept request with correct secret in x-webhook-secret', async () => {
      const response = await request(app)
        .post('/webhooks/lifecycle')
        .set('x-webhook-secret', LIFECYCLE_SECRET)
        .send({ event_type: 'run_created', id: 'run-1' });

      expect(response.status).toBe(200);
    });

    it('should reject request with incorrect secret', async () => {
      const response = await request(app)
        .post('/webhooks/lifecycle')
        .set('x-lifecycle-secret', 'wrong-secret')
        .send({ event_type: 'run_created', id: 'run-1' });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid webhook secret');
    });
  });
});
