import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import fc from 'fast-check';
import { statusRouter } from '../../src/http/status.js';

const mockGetConductorHealth = jest.fn(async () => ({ status: 'healthy', checks: { queue: 'ok' } }));
const mockBudgetStatus = jest.fn(async () => ({ status: 'healthy', remaining: 100 }));
const mockCreateBudgetController = jest.fn(() => ({ getBudgetStatus: mockBudgetStatus }));

jest.mock('../../src/conductor/metrics/index.js', () => ({
  getConductorHealth: () => mockGetConductorHealth(),
}));

jest.mock('../../src/conductor/admission/budget-control.js', () => ({
  createBudgetController: () => mockCreateBudgetController(),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({ disconnect: jest.fn() }));
});

type FetchMock = jest.MockedFunction<typeof fetch>;

describe('statusRouter contract', () => {
  const allowedServices = [
    'neo4j',
    'postgres',
    'redis',
    'mcp-graphops',
    'mcp-files',
    'opa',
  ];

  const originalConductorFlag = process.env.CONDUCTOR_ENABLED;

  const makeApp = () => {
    const app = express();
    app.use(statusRouter);
    return app;
  };

  beforeEach(() => {
    process.env.CONDUCTOR_ENABLED = 'true';
    mockGetConductorHealth.mockResolvedValue({ status: 'healthy', checks: { queue: 'ok' } });
    mockBudgetStatus.mockResolvedValue({ status: 'healthy', remaining: 100 });
    mockCreateBudgetController.mockReturnValue({ getBudgetStatus: mockBudgetStatus });

    const mockHeaders = {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    };

    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: mockHeaders,
      json: async () => ({ status: 'ok' }),
    })) as unknown as FetchMock;

    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.CONDUCTOR_ENABLED = originalConductorFlag;
  });

  it('exposes a stable contract for /status', async () => {
    const response = await request(makeApp()).get('/status').expect(200);

    expect(response.headers['x-conductor-status']).toBeDefined();
    expect(response.body).toMatchObject({
      host: expect.any(String),
      overall_status: 'healthy',
      conductor: expect.objectContaining({ enabled: true }),
      services: expect.any(Array),
    });

    expect(response.body.services).toHaveLength(allowedServices.length);
    response.body.services.forEach((service: Record<string, unknown>) => {
      expect(service).toMatchObject({
        name: expect.any(String),
        status: expect.stringMatching(/healthy|degraded|unhealthy/),
        last_check: expect.any(String),
      });
    });

    expect(response.body.versions).toHaveProperty('server');
    expect((global.fetch as FetchMock).mock.calls).toHaveLength(allowedServices.length);
  });

  it('rejects unknown service probes without hitting the network', async () => {
    const app = makeApp();
    const serviceSet = new Set(allowedServices);

    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 1, maxLength: 12 }).filter((name: string) => !serviceSet.has(name)),
        async (service: string) => {
          const response = await request(app).get(`/health/${service}`).expect(404);
          expect(response.body.available_services.sort()).toEqual(Array.from(serviceSet).sort());
          expect((global.fetch as FetchMock).mock.calls.length).toBe(0);
        },
      ),
      { numRuns: 25, endOnFailure: true },
    );
  });
});
