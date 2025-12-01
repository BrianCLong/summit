
import request from 'supertest';
import express from 'express';
import monitoringRouter from '../monitoring';
import {
  goldenPathStepTotal,
  maestroDeploymentsTotal,
  maestroPrLeadTimeHours,
} from '../../monitoring/metrics';

// Mock metrics
jest.mock('../../monitoring/metrics', () => {
  const inc = jest.fn();
  const observe = jest.fn();
  return {
    goldenPathStepTotal: { inc },
    maestroDeploymentsTotal: { inc },
    maestroPrLeadTimeHours: { observe },
    maestroChangeFailureRate: { set: jest.fn() },
    maestroMttrHours: { observe },
    register: {
      contentType: 'text/plain',
      metrics: jest.fn().mockResolvedValue('mocked_metrics'),
    },
    webVitalValue: {
      set: jest.fn(),
    },
  };
});

const app = express();
app.use(express.json());
app.use('/', monitoringRouter);

describe('Monitoring Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /telemetry/events', () => {
    it('should increment goldenPathStepTotal for golden_path_step event', async () => {
      const payload = {
        event: 'golden_path_step',
        labels: {
          step: 'investigation_created',
          status: 'success',
        },
      };

      const response = await request(app)
        .post('/telemetry/events')
        .set('x-tenant-id', 'test-tenant')
        .send(payload);

      expect(response.status).toBe(202);
      expect(goldenPathStepTotal.inc).toHaveBeenCalledWith({
        step: 'investigation_created',
        status: 'success',
        tenant_id: 'test-tenant',
      });
    });

    it('should return 400 if event name is missing', async () => {
      const response = await request(app)
        .post('/telemetry/events')
        .send({ labels: {} });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /telemetry/dora', () => {
    it('should increment maestroDeploymentsTotal for deployment metric', async () => {
      const payload = {
        metric: 'deployment',
        labels: {
          environment: 'staging',
          status: 'success',
        },
      };

      const response = await request(app).post('/telemetry/dora').send(payload);

      expect(response.status).toBe(202);
      expect(maestroDeploymentsTotal.inc).toHaveBeenCalledWith({
        environment: 'staging',
        status: 'success',
      });
    });

    it('should observe lead time', async () => {
      const payload = {
        metric: 'lead_time',
        value: 12.5,
      };

      const response = await request(app).post('/telemetry/dora').send(payload);

      expect(response.status).toBe(202);
      expect(maestroPrLeadTimeHours.observe).toHaveBeenCalledWith(12.5);
    });

    it('should return 400 for unknown metric', async () => {
      const response = await request(app)
        .post('/telemetry/dora')
        .send({ metric: 'unknown_metric' });

      expect(response.status).toBe(400);
    });
  });
});
