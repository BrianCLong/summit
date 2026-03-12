import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { attachFlagContext, attachFlagHeaders, RequestWithFlags } from '../flags';

// The key here is using class syntax or a proper constructor mock for vi.mock
vi.mock('@intelgraph/flags/index', () => {
  return {
    FlagClient: vi.fn().mockImplementation(function() {
      return {
        catalogKey: vi.fn().mockReturnValue('feature.policy-guard'),
        get: vi.fn().mockResolvedValue(true),
      };
    }),
  };
});

describe('flags middleware', () => {
  let req: Partial<RequestWithFlags>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      header: vi.fn().mockReturnValue(undefined),
      query: {},
      user: { id: 'user1', roles: ['admin'] },
    } as any;

    res = {
      setHeader: vi.fn(),
    };

    next = vi.fn();

    process.env.NODE_ENV = 'test';
  });

  describe('attachFlagContext', () => {
    it('attaches flag context based on request headers and user', () => {
      (req.header as any).mockImplementation((name: string) => {
        if (name === 'x-tenant-id') return 'tenant1';
        if (name === 'x-region') return 'us-east';
        if (name === 'x-canary-weight') return '50';
        return undefined;
      });

      attachFlagContext(req as RequestWithFlags, res as Response, next);

      expect(req.flagContext).toEqual({
        env: 'test',
        tenant: 'tenant1',
        userId: 'user1',
        userRole: 'admin',
        region: 'us-east',
        canaryWeight: 50,
      });
      expect(next).toHaveBeenCalled();
    });

    it('falls back to defaults when headers are missing', () => {
      req.user = undefined;

      attachFlagContext(req as RequestWithFlags, res as Response, next);

      expect(req.flagContext).toEqual({
        env: 'test',
        tenant: undefined,
        userId: undefined,
        userRole: undefined,
        region: undefined,
        canaryWeight: 0,
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('attachFlagHeaders', () => {
    it('evaluates flags and sets response header', async () => {
      req.flagContext = { env: 'test' } as any;

      await attachFlagHeaders(req as RequestWithFlags, res as Response, next);

      expect(req.flags).toEqual({ 'feature.policy-guard': true });
      expect(res.setHeader).toHaveBeenCalledWith(
        'x-feature-flags',
        JSON.stringify({ 'feature.policy-guard': true })
      );
      expect(next).toHaveBeenCalled();
    });

    it('uses default env if flagContext is not present', async () => {
      await attachFlagHeaders(req as RequestWithFlags, res as Response, next);

      expect(req.flags).toEqual({ 'feature.policy-guard': true });
      expect(res.setHeader).toHaveBeenCalledWith(
        'x-feature-flags',
        JSON.stringify({ 'feature.policy-guard': true })
      );
      expect(next).toHaveBeenCalled();
    });
  });
});
