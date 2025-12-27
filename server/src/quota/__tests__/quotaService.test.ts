import { quotaGuards, quotaMiddleware } from '../middleware';
import { QuotaService } from '../service';
import { resetTenantQuotaCache } from '../config';
import httpMocks from 'node-mocks-http';

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
    const request = httpMocks.createRequest({
      method: 'GET',
      url: '/api/test',
      headers: { 'x-tenant-id': 'alpha' },
    });
    const response = httpMocks.createResponse();
    const next = jest.fn();

    const middleware = quotaMiddleware as any;
    await middleware(request, response, next);
    await middleware(request, response, next);
    await middleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(response.statusCode).toBe(429);
    const data = response._getJSONData();
    expect(data.reason).toBe('api_rate_exceeded');
    expect(data.retryAfterMs).toBeGreaterThan(0);
  });
});
