import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
// import { createApp } from '../../app.js';
import { pg } from '../../db/pg.js';
import { webhookQueue } from '../webhook.queue.js';
import express from 'express';
import webhookRouter from '../routes/webhooks.js'; // Wait, I need to export default from routes
import { webhookService } from '../webhook.service.js';

// Mock pg module
jest.mock('../../db/pg.js', () => ({
  pg: {
    oneOrNone: jest.fn(),
    many: jest.fn(),
  },
}));

// Mock Queue
jest.mock('../webhook.queue.js', () => ({
  webhookQueue: {
    add: jest.fn(),
  },
}));

describe('Webhook API', () => {
  let app: any;
  const tenantId = 'test-tenant-id';

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/webhooks', (await import('../../routes/webhooks.js')).default);
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  describe('POST /api/webhooks', () => {
    it('should create a webhook', async () => {
      const webhookData = {
        url: 'https://example.com/webhook',
        event_types: ['incident.created'],
      };

      const mockWebhook = {
        id: 'webhook-123',
        tenant_id: tenantId,
        ...webhookData,
        secret: 'generated-secret',
        is_active: true,
      };

      (pg.oneOrNone as jest.Mock<any>).mockResolvedValue(mockWebhook);

      const res = await request(app)
        .post('/api/webhooks')
        .set('x-tenant-id', tenantId)
        .send(webhookData);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockWebhook);
      expect(pg.oneOrNone).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhooks'),
        expect.any(Array),
        { tenantId }
      );
    });

    it('should fail with invalid input', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('x-tenant-id', tenantId)
        .send({
          url: 'not-a-url',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/webhooks', () => {
    it('should list webhooks', async () => {
      const mockWebhooks = [
        { id: '1', url: 'https://a.com' },
        { id: '2', url: 'https://b.com' },
      ];

      (pg.many as jest.Mock<any>).mockResolvedValue(mockWebhooks);

      const res = await request(app)
        .get('/api/webhooks')
        .set('x-tenant-id', tenantId);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockWebhooks);
    });
  });

  describe('POST /api/webhooks/trigger-test', () => {
    it('should trigger a webhook event', async () => {
      const triggerData = {
        eventType: 'incident.created',
        payload: { id: '123', title: 'Test Incident' },
      };

      const mockWebhooks = [
        { id: 'wh-1', url: 'https://a.com', secret: 'sec-1' },
      ];

      (pg.many as jest.Mock<any>).mockResolvedValue(mockWebhooks); // For getting subscribers
      (pg.oneOrNone as jest.Mock<any>).mockResolvedValue({ id: 'delivery-1' }); // For creating delivery

      const res = await request(app)
        .post('/api/webhooks/trigger-test')
        .set('x-tenant-id', tenantId)
        .send(triggerData);

      expect(res.status).toBe(200);
      expect(webhookQueue.add).toHaveBeenCalledWith('deliver-webhook', expect.objectContaining({
        deliveryId: 'delivery-1',
        webhookId: 'wh-1',
        eventType: triggerData.eventType,
        payload: triggerData.payload
      }));
    });
  });
});
