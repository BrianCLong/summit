import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getRlsContext } from '../../security/rlsContext.js';
import { rlsSessionMiddleware } from '../rls-session.js';

describe('rlsSessionMiddleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RLS_V1 = '1';
    process.env.NODE_ENV = 'staging';
  });

  afterEach(() => {
    delete process.env.RLS_V1;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('binds tenant and case context for tracked paths', async () => {
    const middleware = rlsSessionMiddleware({ trackedPrefixes: ['/api/cases'] });
    const req: any = {
      path: '/api/cases/123',
      method: 'GET',
      headers: { 'x-tenant-id': 'tenant-a' },
      params: { id: 'case-123' },
    };
    const res: any = {
      once: jest.fn((event: string, handler: () => void) => {
        if (event === 'finish') {
          handler();
        }
      }),
    };

    await new Promise<void>((resolve) => {
      middleware(req, res, () => {
        const ctx = getRlsContext();
        expect(ctx).toBeDefined();
        expect(ctx?.tenantId).toBe('tenant-a');
        expect(ctx?.caseId).toBe('case-123');
        expect(ctx?.enabled).toBe(true);
        resolve();
      });
    });

    expect(res.once).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('skips binding when feature flag is off', () => {
    process.env.RLS_V1 = '0';
    const middleware = rlsSessionMiddleware({ trackedPrefixes: ['/api/cases'] });
    const req: any = { path: '/api/cases/abc', headers: {} };
    const res: any = { once: jest.fn() };

    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
      expect(getRlsContext()).toBeUndefined();
    });

    expect(nextCalled).toBe(true);
    expect(res.once).not.toHaveBeenCalled();
  });
});
