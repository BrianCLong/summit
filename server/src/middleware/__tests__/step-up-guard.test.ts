import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { nextFactory, requestFactory, responseFactory } from '../../../../tests/factories/requestFactory.js';
import { requireStepUpGuard, STEP_UP_ERROR_CODE } from '../step-up-guard.js';

const originalEnv = process.env.STEP_UP_GUARD_ENABLED;

describe('requireStepUpGuard', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env.STEP_UP_GUARD_ENABLED = originalEnv;
  });

  it('allows the request when step-up is present', () => {
    process.env.STEP_UP_GUARD_ENABLED = 'true';
    const req = requestFactory({
      user: { id: 'user-1', mfaVerified: true },
    });
    const res = responseFactory();
    const next = nextFactory();

    requireStepUpGuard(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks the request when step-up is missing', () => {
    process.env.STEP_UP_GUARD_ENABLED = 'true';
    const req = requestFactory();
    const res = responseFactory();
    const next = nextFactory();

    requireStepUpGuard(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Step-up authentication required',
      code: STEP_UP_ERROR_CODE,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('skips enforcement when feature flag is disabled', () => {
    process.env.STEP_UP_GUARD_ENABLED = 'false';
    const req = requestFactory();
    const res = responseFactory();
    const next = nextFactory();

    requireStepUpGuard(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
