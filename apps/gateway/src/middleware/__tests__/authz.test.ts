import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authzMiddleware } from '../authz';
import { logger } from '../../logger';

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('authzMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      path: '/api/resource',
      method: 'GET',
      headers: {
        'x-subject-id': 'user123',
        'x-roles': 'admin,user',
      },
      ip: '127.0.0.1',
    };

    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    next = vi.fn();
  });

  it('bypasses /healthz path', async () => {
    req.path = '/healthz';

    await authzMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('allows request when OPA returns allow: true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { allow: true } }),
    });

    await authzMiddleware(req as Request, res as Response, next);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('denies request when OPA returns allow: false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { allow: false, deny: ['missing_role'] } }),
    });

    await authzMiddleware(req as Request, res as Response, next);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'forbidden',
      reasons: ['missing_role'],
      traceId: expect.any(String),
    });
    expect(res.setHeader).toHaveBeenCalledWith('x-deny-reason', 'missing_role');
  });

  it('handles non-200 OPA response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await authzMiddleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'authz_unavailable',
      traceId: expect.any(String),
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('handles fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await authzMiddleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'authz_unavailable',
      traceId: expect.any(String),
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
