"use strict";
/**
 * Role-Based Access Control (RBAC) Manager
 *
 * Manages roles, permissions, and access control
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACManager = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('rbac-manager');
class RBACManager {
    roles = new Map();
    users = new Map();
    defineRole(role) {
        this.roles.set(role.name, role);
        logger.info('Role defined', { role: role.name });
    }
    assignRole(userId, roleName) {
        let user = this.users.get(userId);
        if (!user) {
            user = { id: userId, roles: [] };
            this.users.set(userId, user);
        }
        if (!user.roles.includes(roleName)) {
            user.roles.push(roleName);
            logger.info('Role assigned', { userId, role: roleName });
        }
    }
    revokeRole(userId, roleName) {
        const user = this.users.get(userId);
        if (!user) {
            return;
        }
        user.roles = user.roles.filter(r => r !== roleName);
        logger.info('Role revoked', { userId, role: roleName });
    }
    grantPermission(userId, permission) {
        let user = this.users.get(userId);
        if (!user) {
            user = { id: userId, roles: [] };
            this.users.set(userId, user);
        }
        if (!user.customPermissions) {
            user.customPermissions = [];
        }
        user.customPermissions.push(permission);
        logger.info('Permission granted', { userId, permission });
    }
    hasPermission(userId, resource, action) {
        const user = this.users.get(userId);
        if (!user) {
            return false;
        }
        // Check custom permissions
        if (user.customPermissions?.some(p => this.matchesPermission(p, resource, action))) {
            return true;
        }
        // Check role permissions
        const allPermissions = this.getUserPermissions(user);
        return allPermissions.some(p => this.matchesPermission(p, resource, action));
    }
    getUserPermissions(user) {
        const permissions = [];
        const visited = new Set();
        const collectPermissions = (roleName) => {
            if (visited.has(roleName)) {
                return;
            }
            visited.add(roleName);
            const role = this.roles.get(roleName);
            if (!role) {
                return;
            }
            permissions.push(...role.permissions);
            // Collect inherited permissions
            if (role.inherits) {
                role.inherits.forEach(inheritedRole => collectPermissions(inheritedRole));
            }
        };
        user.roles.forEach(roleName => collectPermissions(roleName));
        if (user.customPermissions) {
            permissions.push(...user.customPermissions);
        }
        return permissions;
    }
    getUserRoles(userId) {
        const user = this.users.get(userId);
        return user?.roles || [];
    }
    matchesPermission(permission, resource, action) {
        // Exact match
        if (permission.resource === resource && permission.action === action) {
            return true;
        }
        // Wildcard resource
        if (permission.resource === '*' && permission.action === action) {
            return true;
        }
        // Wildcard action
        if (permission.resource === resource && permission.action === '*') {
            return true;
        }
        // Both wildcards
        if (permission.resource === '*' && permission.action === '*') {
            return true;
        }
        // Pattern matching for resources (e.g., "users:*" matches "users:123")
        if (permission.resource.endsWith(':*')) {
            const prefix = permission.resource.slice(0, -1);
            if (resource.startsWith(prefix) && permission.action === action) {
                return true;
            }
        }
        return false;
    }
    // Predefined roles for intelligence operations
    initializeDefaultRoles() {
        this.defineRole({
            name: 'admin',
            description: 'Full system access',
            permissions: [{ resource: '*', action: '*' }],
        });
        this.defineRole({
            name: 'analyst',
            description: 'Intelligence analyst',
            permissions: [
                { resource: 'investigations', action: 'read' },
                { resource: 'investigations', action: 'create' },
                { resource: 'entities', action: 'read' },
                { resource: 'relationships', action: 'read' },
                { resource: 'reports', action: 'create' },
            ],
        });
        this.defineRole({
            name: 'viewer',
            description: 'Read-only access',
            permissions: [
                { resource: 'investigations', action: 'read' },
                { resource: 'entities', action: 'read' },
                { resource: 'relationships', action: 'read' },
                { resource: 'reports', action: 'read' },
            ],
        });
        this.defineRole({
            name: 'api_consumer',
            description: 'API access for integrations',
            permissions: [
                { resource: 'api:investigations', action: 'read' },
                { resource: 'api:entities', action: 'read' },
            ],
        });
        logger.info('Default roles initialized');
    }
}
exports.RBACManager = RBACManager;
