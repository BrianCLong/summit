import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { tenantContext } from '../tenantContext.js';
import { tenantService } from '../../tenancy/tenantService.js';

// Mock tenantService
jest.mock('../../tenancy/tenantService.js');

describe('tenantContext middleware', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      path: '/api/test',
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should skip health check paths', async () => {
    req.path = '/healthz';
    await tenantContext(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(tenantService.getTenant).not.toHaveBeenCalled();
  });

  it('should call next if no tenant header is present (soft enforcement)', async () => {
      req.path = '/api/test';
      await tenantContext(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.tenant).toBeUndefined();
  });

  it('should load tenant if header is present', async () => {
    req.headers['x-tenant-id'] = 't1';
    const mockTenant = { id: 't1', name: 'Test', status: 'active' };
    // Using any to bypass TS error in test file
    (tenantService.getTenant as any).mockResolvedValue(mockTenant);

    await tenantContext(req, res, next);

    expect(tenantService.getTenant).toHaveBeenCalledWith('t1');
    expect(req.tenant).toEqual(mockTenant);
    expect(next).toHaveBeenCalled();
  });

  it('should return 404 if tenant not found', async () => {
    req.headers['x-tenant-id'] = 't1';
    (tenantService.getTenant as any).mockResolvedValue(null);

    await tenantContext(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Tenant not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if tenant is suspended', async () => {
      req.headers['x-tenant-id'] = 't1';
      const mockTenant = { id: 't1', name: 'Test', status: 'suspended' };
      (tenantService.getTenant as any).mockResolvedValue(mockTenant);

      await tenantContext(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Tenant is not active' });
      expect(next).not.toHaveBeenCalled();
  });
});
