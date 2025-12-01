import type { Request, Response } from 'express';
import {
  Q3CClient,
  createQ3CAnnotationMiddleware,
  createQ3CBudgetGuard,
} from '../q3cCostGuard';

describe('q3c middleware', () => {
  const makeResponse = (payload: unknown, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 403 ? 'Forbidden' : 'OK',
    text: async () => JSON.stringify(payload),
  });

  const baseEnvelope = {
    jobId: 'job-1',
    region: 'us-east-1',
    resources: {
      cpuSeconds: 10,
      ramGbHours: 1,
      ioGb: 0.5,
      egressGb: 0.1,
    },
  };

  test('annotation middleware attaches projected and actual payloads', async () => {
    const fetchMock = jest.fn();
    const projected = {
      ...baseEnvelope,
      projected: {
        costUsd: 1,
        carbonKg: 0.1,
        energyKwh: 0.02,
        breakdown: { cpuUsd: 0.2, ramUsd: 0.3, ioUsd: 0.4, egressUsd: 0.1 },
        modelVersion: 'test',
        errorMargin: 0.05,
      },
    };

    const actual = {
      ...projected,
      actual: {
        costUsd: 1.1,
        carbonKg: 0.11,
        energyKwh: 0.021,
        breakdown: projected.projected.breakdown,
        usage: baseEnvelope.resources,
        delta: { costUsd: 0.1, carbonKg: 0.01 },
      },
    };

    fetchMock
      .mockResolvedValueOnce(makeResponse(projected))
      .mockResolvedValueOnce(makeResponse(actual));

    const client = new Q3CClient({
      baseUrl: 'http://q3c.test',
      fetchImpl: fetchMock as any,
    });
    const middleware = createQ3CAnnotationMiddleware(client);

    const req = {
      body: { ...baseEnvelope, actualResources: baseEnvelope.resources },
    } as unknown as Request;
    const next = jest.fn();

    await middleware(req, {} as Response, next);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalled();

    const context = (req as Request & { q3c?: unknown }).q3c as any;
    expect(context.projected).toEqual(projected);
    expect(context.actual).toEqual(actual);
  });

  test('budget guard denies runs deterministically over budget', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      makeResponse(
        {
          jobId: 'budget-1',
          region: 'us-east-1',
          budgetUsd: 1,
          projectedUsd: 2,
          projectedCarbonKg: 0.2,
          allowed: false,
          marginUsd: -1,
          modelVersion: 'test',
          errorMargin: 0.05,
        },
        403,
      ),
    );

    const client = new Q3CClient({
      baseUrl: 'http://q3c.test',
      fetchImpl: fetchMock as any,
    });
    const guard = createQ3CBudgetGuard(client, {
      getBudget: () => 1,
    });

    const req = { body: baseEnvelope } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn();

    await guard(req, res, next);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'budget_exceeded', jobId: 'job-1' }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
