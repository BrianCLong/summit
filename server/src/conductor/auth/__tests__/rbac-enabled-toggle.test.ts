import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
jest.mock('../jwt-rotation.js', () => ({
  jwtRotationManager: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('../../config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const originalEnv = process.env.RBAC_ENABLED;

const loadRbacModule = async () => {
  jest.resetModules();
  return import('../rbac-middleware.js');
};

const loadWithEnv = async (value: string | undefined) => {
  if (value === undefined) {
    delete process.env.RBAC_ENABLED;
  } else {
    process.env.RBAC_ENABLED = value;
  }

  return loadRbacModule();
};

describe('RBAC enablement toggle', () => {
  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RBAC_ENABLED;
    } else {
      process.env.RBAC_ENABLED = originalEnv;
    }
  });

  it('defaults to enabled when RBAC_ENABLED is unset', async () => {
    const { rbacManager } = await loadWithEnv(undefined);
    expect(rbacManager.getConfig().enabled).toBe(true);
  });

  it.each(['false', '0', 'no'])(
    'disables RBAC when RBAC_ENABLED=%s',
    async (value) => {
      const { rbacManager } = await loadWithEnv(value);
      expect(rbacManager.getConfig().enabled).toBe(false);
    },
  );

  it.each(['true', '1', 'yes'])(
    'enables RBAC when RBAC_ENABLED=%s',
    async (value) => {
      const { rbacManager } = await loadWithEnv(value);
      expect(rbacManager.getConfig().enabled).toBe(true);
    },
  );

  it('bypasses permission checks when disabled', async () => {
    const { requirePermission } = await loadWithEnv('false');
    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const req = { headers: {} } as any;

    requirePermission('anything')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
