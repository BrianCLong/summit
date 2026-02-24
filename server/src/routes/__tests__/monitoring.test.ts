import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock functions declared before mocks
const mockInc = jest.fn();
const mockObserve = jest.fn();
const mockSet = jest.fn();
const mockMetrics = jest.fn().mockResolvedValue('mocked_metrics');

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../monitoring/metrics', () => ({
  goldenPathStepTotal: { inc: mockInc },
  maestroDeploymentsTotal: { inc: mockInc },
  maestroPrLeadTimeHours: { observe: mockObserve },
  maestroChangeFailureRate: { set: mockSet },
  maestroMttrHours: { observe: mockObserve },
  uiErrorBoundaryCatchTotal: { inc: mockInc },
  register: {
    contentType: 'text/plain',
    metrics: mockMetrics,
  },
  webVitalValue: {
    set: mockSet,
  },
}));

// Dynamic imports AFTER mocks are set up
const monitoringRouter = (await import('../monitoring')).default;
const {
  goldenPathStepTotal,
  maestroDeploymentsTotal,
  maestroPrLeadTimeHours,
  uiErrorBoundaryCatchTotal,
} = await import('../../monitoring/metrics');

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

  it('should route ui_error_boundary telemetry to metrics', async () => {
    const payload = {
      event: 'ui_error_boundary',
      labels: {
        component: 'TestComponent',
        message: 'Boom',
      },
    };

    const response = await request(app)
      .post('/telemetry/events')
      .set('x-tenant-id', 'tenant-123')
      .send(payload);

    expect(response.status).toBe(202);
    expect(goldenPathStepTotal.inc).not.toHaveBeenCalled();
    expect(maestroDeploymentsTotal.inc).not.toHaveBeenCalled();
    expect(uiErrorBoundaryCatchTotal.inc).toHaveBeenCalledWith({
      component: 'TestComponent',
      tenant_id: 'tenant-123',
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
