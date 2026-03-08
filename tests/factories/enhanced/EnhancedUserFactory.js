"use strict";
/**
 * Enhanced User Factory
 *
 * Type-safe factory for generating test user data with traits and associations.
 *
 * @module tests/factories/enhanced
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewerUserFactory = exports.analystUserFactory = exports.adminUserFactory = exports.enhancedUserFactory = void 0;
const base_1 = require("../base");
/**
 * Default permissions by role
 */
const ROLE_PERMISSIONS = {
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
exports.enhancedUserFactory = (0, base_1.defineFactory)({
    defaults: () => {
        const seq = (0, base_1.getSequence)('user').next();
        const firstName = `Test${seq}`;
        const lastName = `User`;
        const role = 'analyst';
        const now = new Date();
        return {
            id: base_1.random.uuid(),
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
            role: 'admin',
            permissions: [...ROLE_PERMISSIONS.admin],
        }),
        analyst: (base) => ({
            role: 'analyst',
            permissions: [...ROLE_PERMISSIONS.analyst],
        }),
        viewer: (base) => ({
            role: 'viewer',
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
            tenantId: `tenant-${base_1.random.string(8)}`,
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
exports.adminUserFactory = exports.enhancedUserFactory.extend({
    defaults: () => ({
        ...exports.enhancedUserFactory.build(),
        role: 'admin',
        permissions: [...ROLE_PERMISSIONS.admin],
    }),
});
exports.analystUserFactory = exports.enhancedUserFactory.extend({
    defaults: () => ({
        ...exports.enhancedUserFactory.build(),
        role: 'analyst',
        permissions: [...ROLE_PERMISSIONS.analyst],
    }),
});
exports.viewerUserFactory = exports.enhancedUserFactory.extend({
    defaults: () => ({
        ...exports.enhancedUserFactory.build(),
        role: 'viewer',
        permissions: [...ROLE_PERMISSIONS.viewer],
    }),
});
exports.default = exports.enhancedUserFactory;
