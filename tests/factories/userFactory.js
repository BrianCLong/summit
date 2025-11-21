/**
 * User Factory
 *
 * Generates test user data with sensible defaults
 */
import { randomUUID } from 'crypto';
/**
 * Create a test user with optional overrides
 */
export function userFactory(options = {}) {
    const id = options.id || randomUUID();
    const username = options.username || `testuser_${id.slice(0, 8)}`;
    const email = options.email || `${username}@test.intelgraph.local`;
    const role = options.role || 'analyst';
    const tenantId = options.tenantId || 'test-tenant-1';
    const now = new Date();
    const defaultPermissions = {
        admin: ['read', 'write', 'delete', 'admin', 'manage_users'],
        analyst: ['read', 'write', 'create_investigations'],
        viewer: ['read'],
        user: ['read', 'write'],
    };
    return {
        id,
        email,
        username,
        role,
        tenantId,
        permissions: options.permissions || defaultPermissions[role] || [],
        createdAt: options.createdAt || now,
        updatedAt: options.updatedAt || now,
    };
}
/**
 * Create multiple test users
 */
export function userFactoryBatch(count, options = {}) {
    return Array.from({ length: count }, () => userFactory(options));
}
/**
 * Create an admin user for testing
 */
export function adminUserFactory(options = {}) {
    return userFactory({ ...options, role: 'admin' });
}
/**
 * Create an analyst user for testing
 */
export function analystUserFactory(options = {}) {
    return userFactory({ ...options, role: 'analyst' });
}
/**
 * Create a viewer user for testing
 */
export function viewerUserFactory(options = {}) {
    return userFactory({ ...options, role: 'viewer' });
}
//# sourceMappingURL=userFactory.js.map