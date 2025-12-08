import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MultiTenantRBACManager, MultiTenantUser, TenantRole } from '../../src/auth/multi-tenant-rbac';

// Mock logger
jest.mock('../../src/config/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('MultiTenantRBACManager', () => {
  let rbac: MultiTenantRBACManager;

  beforeEach(() => {
    rbac = new MultiTenantRBACManager({ enabled: true });
  });

  const createMockUser = (roles: TenantRole[] = [], globalRoles: string[] = []): MultiTenantUser => ({
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    tenantId: 'tenant-1',
    tenantIds: ['tenant-1'],
    primaryTenantId: 'tenant-1',
    roles: roles,
    globalRoles: globalRoles,
    attributes: {},
    clearanceLevel: 'unclassified',
    lastAuthenticated: new Date(),
    mfaVerified: true,
  });

  it('should allow access if user has permission', () => {
    const user = createMockUser([
      { tenantId: 'tenant-1', role: 'viewer', permissions: [], scope: 'full', grantedBy: 'admin', grantedAt: new Date() }
    ]);
    // viewer has 'investigation:read'
    expect(rbac.hasPermission(user, 'investigation:read', 'tenant-1')).toBe(true);
  });

  it('should deny access if user lacks permission', () => {
    const user = createMockUser([
      { tenantId: 'tenant-1', role: 'viewer', permissions: [], scope: 'full', grantedBy: 'admin', grantedAt: new Date() }
    ]);
    // viewer does NOT have 'investigation:create'
    expect(rbac.hasPermission(user, 'investigation:create', 'tenant-1')).toBe(false);
  });

  it('should allow access for global admin', () => {
    const user = createMockUser([], ['global-admin']);
    expect(rbac.hasPermission(user, 'anything:do', 'tenant-1')).toBe(true);
  });

  it('should enforce tenant isolation', () => {
    const user = createMockUser([
      { tenantId: 'tenant-1', role: 'admin', permissions: ['*'], scope: 'full', grantedBy: 'admin', grantedAt: new Date() }
    ]);
    // User has admin in tenant-1, but checks permission in tenant-2
    // roles filter matches tenantId. If no role in tenant-2, denied.
    expect(rbac.hasPermission(user, 'investigation:read', 'tenant-2')).toBe(false);
  });
});
