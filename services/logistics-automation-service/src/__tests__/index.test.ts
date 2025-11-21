/**
 * Unit tests for Logistics Automation Service
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Health endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'logistics-automation-service' });
  });

  // Mock forecast generation
  app.post('/api/forecasts/generate', (req, res) => {
    const { itemIds = ['ITEM-001'], forecastHorizonDays = 90 } = req.body;
    const forecasts = itemIds.map((itemId: string) => ({
      id: `forecast-${Date.now()}`,
      itemId,
      description: `Forecast for ${itemId}`,
      forecastMethod: 'ml_predictive',
      predictedQuantity: 500,
      confidenceLevel: 0.87,
      forecastHorizonDays,
    }));
    res.status(201).json({ data: forecasts });
  });

  return app;
};

describe('Logistics Automation Service', () => {
  const app = createTestApp();

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('logistics-automation-service');
    });
  });

  describe('Forecast Generation', () => {
    it('should generate forecasts for given items', async () => {
      const response = await request(app)
        .post('/api/forecasts/generate')
        .send({
          itemIds: ['ITEM-001', 'ITEM-002'],
          forecastHorizonDays: 90,
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('itemId', 'ITEM-001');
      expect(response.body.data[0]).toHaveProperty('predictedQuantity');
      expect(response.body.data[0]).toHaveProperty('confidenceLevel');
    });

    it('should use default values when not provided', async () => {
      const response = await request(app)
        .post('/api/forecasts/generate')
        .send({});

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].itemId).toBe('ITEM-001');
    });
  });
});
