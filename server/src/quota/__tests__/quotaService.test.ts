import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { quotaGuards, quotaMiddleware } from '../middleware.js';
import { QuotaService, quotaService } from '../service.js';
import { resetTenantQuotaCache } from '../config.js';
import type { Request, Response } from 'express';

const createMockReq = (init?: Partial<Request>): Request => {
  return ({
    headers: {},
    method: 'GET',
    url: '/api/test',
    ...init,
  } as unknown) as Request;
};

const createMockRes = (): Response & { body?: any } => {
  const headers: Record<string, unknown> = {};
  let statusCode = 200;
  let body: any;

  return ({
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      body = payload;
      return this;
    },
    setHeader(key: string, value: unknown) {
      headers[key.toLowerCase()] = value;
    },
    getHeader(key: string) {
      return headers[key.toLowerCase()];
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  } as unknown) as Response & { body?: any };
};

describe('QuotaService integration', () => {
  const quotaJson = JSON.stringify({
    alpha: {
      storageBytes: 1024,
      evidenceCount: 1,
      exportCount: 1,
      jobConcurrency: 1,
      apiRatePerMinute: 2,
    },
  });

  let service: QuotaService;

  beforeEach(() => {
    process.env.TENANT_QUOTAS = quotaJson;
    resetTenantQuotaCache();
    quotaService.reset();
    service = new QuotaService();
  });

  afterEach(() => {
    service.reset();
    delete process.env.TENANT_QUOTAS;
  });

  test('enforces evidence finalization deterministically', () => {
    const first = service.checkEvidence('alpha', 'evidence-1', 512);
    const repeat = service.checkEvidence('alpha', 'evidence-1', 512);
    expect(first.allowed).toBe(true);
    expect(repeat.allowed).toBe(true);
    expect(repeat.used).toBe(1);
    const second = service.checkEvidence('alpha', 'evidence-2', 256);
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe('evidence_exceeded');
  });

  test('blocks export creation after limit reached', () => {
    const first = quotaGuards.checkExportCreation('alpha', 'export-1');
    const second = quotaGuards.checkExportCreation('alpha', 'export-2');
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe('export_exceeded');
  });

  test('limits job concurrency and allows completion', () => {
    const first = service.checkJobEnqueue('alpha', 'job-1');
    const second = service.checkJobEnqueue('alpha', 'job-2');
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    service.completeJob('alpha');
    const third = service.checkJobEnqueue('alpha', 'job-3');
    expect(third.allowed).toBe(true);
  });

  test('enforces storage bytes and returns remaining budget', () => {
    const allowed = service.checkStorageBytes('alpha', 512, 'file-1');
    const denied = service.checkStorageBytes('alpha', 600, 'file-2');
    expect(allowed.allowed).toBe(true);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('storage_exceeded');
  });

  test('middleware blocks API rate and returns retry metadata', async () => {
    const request = createMockReq({ headers: { 'x-tenant-id': 'alpha' } });
    const response = createMockRes();
    const next = jest.fn();

    const middleware = quotaMiddleware as any;
    await middleware(request, response, next);
    await middleware(request, response, next);
    await middleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(response.statusCode).toBe(429);
    const data = response.body;
    expect(data.reason).toBe('api_rate_exceeded');
    expect(data.limit).toBe(2);
    expect(data.used).toBe(3);
    expect(data.remaining).toBe(0);
    expect(data.retryAfterMs).toBeGreaterThan(0);
  });

  test('middleware no-ops when TENANT_QUOTAS is empty', async () => {
    delete process.env.TENANT_QUOTAS;
    resetTenantQuotaCache();
    const request = createMockReq();
    const response = createMockRes();
    const next = jest.fn();

    const middleware = quotaMiddleware as any;
    await middleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
    expect(response.getHeader('X-Ratelimit-Limit')).toBeUndefined();
  });

  test('deterministic counters do not double count repeated evidence', () => {
    const first = service.checkEvidence('alpha', 'evidence-dup', 100);
    const second = service.checkEvidence('alpha', 'evidence-dup', 200);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.used).toBe(1);
    const third = service.checkEvidence('alpha', 'evidence-new', 900);
    expect(third.allowed).toBe(false);
    expect(third.reason).toBe('evidence_exceeded');
  });
});
