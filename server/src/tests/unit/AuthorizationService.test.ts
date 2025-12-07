import { AuthorizationServiceImpl } from '../../services/AuthorizationService.js';
import { MultiTenantRBACManager } from '../../auth/multi-tenant-rbac.js';
import { Principal } from '../../types/identity.js';

// Mock dependencies
const mockRBAC = {
  hasPermission: jest.fn(),
  evaluateAccess: jest.fn(),
};

jest.mock('../../auth/multi-tenant-rbac.js', () => ({
  getMultiTenantRBAC: () => mockRBAC,
  MultiTenantRBACManager: jest.fn(),
}));

jest.mock('../../config/database.js', () => ({
  getPostgresPool: () => ({
    query: jest.fn(),
  }),
}));

describe('AuthorizationServiceImpl', () => {
  let authzService: AuthorizationServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    authzService = new AuthorizationServiceImpl();
  });

  const principal: Principal = {
    kind: 'user',
    id: 'user-123',
    tenantId: 'tenant-A',
    roles: ['analyst'],
    scopes: [],
    user: { email: 'test@example.com' },
  };

  test('can() allows access when tenant matches and RBAC allows', async () => {
    // Setup mock to return true for RBAC check
    mockRBAC.hasPermission.mockReturnValue(true);
    mockRBAC.evaluateAccess.mockResolvedValue({ allowed: true });

    const resource = {
      type: 'investigation',
      id: 'inv-1',
      tenantId: 'tenant-A',
    };

    const result = await authzService.can(principal, 'view', resource);

    expect(result).toBe(true);
    expect(mockRBAC.hasPermission).toHaveBeenCalledWith(
      expect.objectContaining({ id: principal.id, tenantId: 'tenant-A' }),
      'investigation:read' // mapped permission
    );
  });

  test('can() denies access when tenant mismatch', async () => {
    const resource = {
      type: 'investigation',
      id: 'inv-1',
      tenantId: 'tenant-B', // Different tenant
    };

    const result = await authzService.can(principal, 'view', resource);

    expect(result).toBe(false);
    expect(mockRBAC.hasPermission).not.toHaveBeenCalled();
  });

  test('can() allows cross-tenant access for global admin', async () => {
     const adminPrincipal: Principal = {
        ...principal,
        roles: ['global-admin'],
     };

    mockRBAC.hasPermission.mockReturnValue(true);
    mockRBAC.evaluateAccess.mockResolvedValue({ allowed: true });

    const resource = {
      type: 'investigation',
      id: 'inv-1',
      tenantId: 'tenant-B', // Different tenant
    };

    const result = await authzService.can(adminPrincipal, 'view', resource);

    expect(result).toBe(true);
    expect(mockRBAC.hasPermission).toHaveBeenCalled();
  });

  test('assertCan() throws on denial', async () => {
    mockRBAC.hasPermission.mockReturnValue(false);

    const resource = {
        type: 'investigation',
        id: 'inv-1',
        tenantId: 'tenant-A',
    };

    await expect(authzService.assertCan(principal, 'view', resource))
        .rejects.toThrow('Permission denied');
  });
});
