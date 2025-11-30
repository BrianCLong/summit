/**
 * Enhanced User Factory
 *
 * Type-safe factory for generating test user data with traits and associations.
 *
 * @module tests/factories/enhanced
 */

import { defineFactory, getSequence, random } from '../base';

/**
 * User role types
 */
export type UserRole = 'admin' | 'analyst' | 'viewer' | 'user';

/**
 * User interface for tests
 */
export interface TestUserEnhanced {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  permissions: string[];
  isActive: boolean;
  isVerified: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

/**
 * Default permissions by role
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'read',
    'write',
    'delete',
    'admin',
    'manage_users',
    'manage_roles',
    'investigation:*',
    'entity:*',
    'relationship:*',
    'system:*',
  ],
  analyst: [
    'read',
    'write',
    'investigation:create',
    'investigation:read',
    'investigation:update',
    'entity:create',
    'entity:read',
    'entity:update',
    'entity:delete',
    'relationship:create',
    'relationship:read',
    'relationship:update',
    'relationship:delete',
    'graph:read',
    'graph:export',
    'ai:request',
  ],
  viewer: [
    'read',
    'investigation:read',
    'entity:read',
    'relationship:read',
    'graph:read',
    'graph:export',
  ],
  user: ['read', 'write'],
};

/**
 * Enhanced User Factory with traits
 */
export const enhancedUserFactory = defineFactory<TestUserEnhanced>({
  defaults: () => {
    const seq = getSequence('user').next();
    const firstName = `Test${seq}`;
    const lastName = `User`;
    const role: UserRole = 'analyst';
    const now = new Date();

    return {
      id: random.uuid(),
      email: `testuser-${seq}@test.intelgraph.local`,
      username: `testuser_${seq}`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      role,
      tenantId: 'test-tenant-default',
      permissions: [...ROLE_PERMISSIONS[role]],
      isActive: true,
      isVerified: true,
      lastLogin: null,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
  },
  traits: {
    admin: (base) => ({
      role: 'admin' as UserRole,
      permissions: [...ROLE_PERMISSIONS.admin],
    }),
    analyst: (base) => ({
      role: 'analyst' as UserRole,
      permissions: [...ROLE_PERMISSIONS.analyst],
    }),
    viewer: (base) => ({
      role: 'viewer' as UserRole,
      permissions: [...ROLE_PERMISSIONS.viewer],
    }),
    inactive: {
      isActive: false,
    },
    unverified: {
      isVerified: false,
    },
    withRecentLogin: () => ({
      lastLogin: new Date(),
    }),
    withOldLogin: () => ({
      lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    }),
    multiTenant: () => ({
      tenantId: `tenant-${random.string(8)}`,
    }),
  },
  afterBuild: (user) => {
    // Ensure fullName is always computed correctly
    user.fullName = `${user.firstName} ${user.lastName}`;
    return user;
  },
});

/**
 * Convenience exports for common user types
 */
export const adminUserFactory = enhancedUserFactory.extend({
  defaults: () => ({
    ...enhancedUserFactory.build(),
    role: 'admin' as UserRole,
    permissions: [...ROLE_PERMISSIONS.admin],
  }),
});

export const analystUserFactory = enhancedUserFactory.extend({
  defaults: () => ({
    ...enhancedUserFactory.build(),
    role: 'analyst' as UserRole,
    permissions: [...ROLE_PERMISSIONS.analyst],
  }),
});

export const viewerUserFactory = enhancedUserFactory.extend({
  defaults: () => ({
    ...enhancedUserFactory.build(),
    role: 'viewer' as UserRole,
    permissions: [...ROLE_PERMISSIONS.viewer],
  }),
});

export default enhancedUserFactory;
