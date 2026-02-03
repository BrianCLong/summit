import { jest } from '@jest/globals';

export const mockRbacManager = {
  hasPermission: jest.fn().mockReturnValue(true),
  evaluateAccess: jest.fn().mockResolvedValue({ allowed: true }),
  getRole: jest.fn().mockReturnValue(null),
  getRoles: jest.fn().mockReturnValue([]),
  hasRole: jest.fn().mockReturnValue(false),
  checkTenantAccess: jest.fn().mockReturnValue(true),
  validateScope: jest.fn().mockReturnValue(true),
};

export const getMultiTenantRBAC = jest.fn().mockReturnValue(mockRbacManager);

export class MultiTenantRBACManager {
  hasPermission = jest.fn().mockReturnValue(true);
  evaluateAccess = jest.fn().mockResolvedValue({ allowed: true });
  getRole = jest.fn().mockReturnValue(null);
  getRoles = jest.fn().mockReturnValue([]);
  hasRole = jest.fn().mockReturnValue(false);
  checkTenantAccess = jest.fn().mockReturnValue(true);
  validateScope = jest.fn().mockReturnValue(true);
}

export default {
  getMultiTenantRBAC,
  MultiTenantRBACManager,
  mockRbacManager,
};
