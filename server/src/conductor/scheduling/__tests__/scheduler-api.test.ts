import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import schedulerRouter from '../scheduler-api.js';
import { costAwareScheduler } from '../cost-aware-scheduler.js';
import { choosePool } from '../selector.js';
import { recordPoolSelectionAudit } from '../pool-selection-audit.js';

jest.mock('../cost-aware-scheduler', () => ({
  costAwareScheduler: {
    schedule: jest.fn(),
  },
}));

jest.mock('../selector.js', () => ({
  choosePool: jest.fn(),
}));

jest.mock('../pool-selection-audit', () => ({
  recordPoolSelectionAudit: jest.fn(),
}));

const mockSchedule = costAwareScheduler.schedule as jest.Mock;
const mockChoosePool = choosePool as jest.Mock;
const mockAudit = recordPoolSelectionAudit as jest.Mock;

describe('scheduler-api pool selection', () => {
  const app = express();
  app.use(express.json());
  app.use('/', schedulerRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSchedule.mockResolvedValue({
      approved: true,
      queueName: 'light_normal',
      estimatedWaitTime: 0,
      budgetImpact: {
        currentUtilization: 0,
        projectedUtilization: 0,
        remainingBudget: 0,
      },
      reason: 'ok',
    });
  });

  it('propagates pool selection when estimates provided', async () => {
    mockChoosePool.mockResolvedValue({ id: 'pool-a', price: 0.42 });

    const res = await request(app).post('/schedule').send({
      expertType: 'graph_ops',
      tenantId: 'tenant-1',
      requestId: 'req-123',
      est: { cpuSec: 10, gbSec: 5, egressGb: 1 },
      residency: 'us-east',
      purpose: 'test-route',
    });

    expect(res.status).toBe(200);
    expect(mockChoosePool).toHaveBeenCalledWith(
      { cpuSec: 10, gbSec: 5, egressGb: 1 },
      'us-east',
    );

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        poolId: 'pool-a',
        poolPriceUsd: 0.42,
        est: { cpuSec: 10, gbSec: 5, egressGb: 1 },
        residency: 'us-east',
        purpose: 'test-route',
      }),
    );
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        poolId: 'pool-a',
        poolPriceUsd: 0.42,
        residency: 'us-east',
      }),
    );
  });

  it('schedules even when no pool is available', async () => {
    mockChoosePool.mockResolvedValue(null);

    const res = await request(app).post('/schedule').send({
      expertType: 'graph_ops',
      tenantId: 'tenant-1',
      requestId: 'req-456',
    });

    expect(res.status).toBe(200);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        poolId: undefined,
        poolPriceUsd: undefined,
        est: {},
        residency: undefined,
      }),
    );
  });
});
