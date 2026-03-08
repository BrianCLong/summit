"use strict";
/**
 * User Factory
 *
 * Generates test user data with sensible defaults
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userFactory = userFactory;
exports.userFactoryBatch = userFactoryBatch;
exports.adminUserFactory = adminUserFactory;
exports.analystUserFactory = analystUserFactory;
exports.viewerUserFactory = viewerUserFactory;
const crypto_1 = require("crypto");
/**
 * Create a test user with optional overrides
 */
function userFactory(options = {}) {
    const id = options.id || (0, crypto_1.randomUUID)();
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
        defaultTenantId: options.defaultTenantId || tenantId,
        permissions: options.permissions || defaultPermissions[role] || [],
        isActive: options.isActive ?? true,
        scopes: options.scopes || [],
        createdAt: options.createdAt || now,
        updatedAt: options.updatedAt || now,
    };
}
/**
 * Create multiple test users
 */
function userFactoryBatch(count, options = {}) {
    return Array.from({ length: count }, () => userFactory(options));
}
/**
 * Create an admin user for testing
 */
function adminUserFactory(options = {}) {
    return userFactory({ ...options, role: 'admin' });
}
/**
 * Create an analyst user for testing
 */
function analystUserFactory(options = {}) {
    return userFactory({ ...options, role: 'analyst' });
}
/**
 * Create a viewer user for testing
 */
function viewerUserFactory(options = {}) {
    return userFactory({ ...options, role: 'viewer' });
}
