"use strict";
/**
 * Admin API Client
 *
 * API client for user and role management operations.
 * All responses are DataEnvelopes with GovernanceVerdict metadata.
 *
 * @module services/admin-api
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminManagementAPI = exports.RoleManagementAPI = exports.UserManagementAPI = void 0;
const api_js_1 = require("./api.js");
// ============================================================================
// User Management API
// ============================================================================
exports.UserManagementAPI = {
    /**
     * List users with pagination and filtering
     */
    list: (params = {}) => {
        const qs = new URLSearchParams();
        if (params.page)
            qs.set('page', String(params.page));
        if (params.pageSize)
            qs.set('pageSize', String(params.pageSize));
        if (params.search)
            qs.set('search', params.search);
        if (params.role)
            qs.set('role', params.role);
        if (params.isActive !== undefined)
            qs.set('isActive', String(params.isActive));
        if (params.sortBy)
            qs.set('sortBy', params.sortBy);
        if (params.sortOrder)
            qs.set('sortOrder', params.sortOrder);
        const query = qs.toString();
        return (0, api_js_1.apiFetch)(`/api/admin/users${query ? `?${query}` : ''}`);
    },
    /**
     * Get a specific user by ID
     */
    get: (userId) => {
        return (0, api_js_1.apiFetch)(`/api/admin/users/${encodeURIComponent(userId)}`);
    },
    /**
     * Create a new user
     */
    create: (payload) => {
        return (0, api_js_1.apiFetch)('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
    /**
     * Update a user
     */
    update: (userId, payload) => {
        return (0, api_js_1.apiFetch)(`/api/admin/users/${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },
    /**
     * Delete (deactivate) a user
     */
    delete: (userId, hard = false) => {
        const qs = hard ? '?hard=true' : '';
        return (0, api_js_1.apiFetch)(`/api/admin/users/${encodeURIComponent(userId)}${qs}`, {
            method: 'DELETE',
        });
    },
    /**
     * Lock a user account
     */
    lock: (userId, reason) => {
        return (0, api_js_1.apiFetch)(`/api/admin/users/${encodeURIComponent(userId)}/lock`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },
    /**
     * Unlock a user account
     */
    unlock: (userId) => {
        return (0, api_js_1.apiFetch)(`/api/admin/users/${encodeURIComponent(userId)}/unlock`, {
            method: 'POST',
        });
    },
    /**
     * Add user to tenant
     */
    addToTenant: (userId, tenantId, roles) => {
        return (0, api_js_1.apiFetch)(`/api/admin/users/${encodeURIComponent(userId)}/tenants`, {
            method: 'POST',
            body: JSON.stringify({ tenantId, roles }),
        });
    },
    /**
     * Remove user from tenant
     */
    removeFromTenant: (userId, tenantId) => {
        return (0, api_js_1.apiFetch)(`/api/admin/users/${encodeURIComponent(userId)}/tenants/${encodeURIComponent(tenantId)}`, {
            method: 'DELETE',
        });
    },
};
// ============================================================================
// Role Management API
// ============================================================================
exports.RoleManagementAPI = {
    /**
     * List all roles
     */
    list: () => {
        return (0, api_js_1.apiFetch)('/api/admin/roles');
    },
    /**
     * Get a specific role by ID
     */
    get: (roleId) => {
        return (0, api_js_1.apiFetch)(`/api/admin/roles/${encodeURIComponent(roleId)}`);
    },
    /**
     * Create a custom role
     */
    create: (payload) => {
        return (0, api_js_1.apiFetch)('/api/admin/roles', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
    /**
     * Update a custom role
     */
    update: (roleId, payload) => {
        return (0, api_js_1.apiFetch)(`/api/admin/roles/${encodeURIComponent(roleId)}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },
    /**
     * Delete a custom role
     */
    delete: (roleId) => {
        return (0, api_js_1.apiFetch)(`/api/admin/roles/${encodeURIComponent(roleId)}`, {
            method: 'DELETE',
        });
    },
    /**
     * List all available permissions
     */
    listPermissions: () => {
        return (0, api_js_1.apiFetch)('/api/admin/roles/permissions/list');
    },
    /**
     * Get user's role assignments
     */
    getUserRoles: (userId) => {
        return (0, api_js_1.apiFetch)(`/api/admin/roles/users/${encodeURIComponent(userId)}`);
    },
    /**
     * Assign role to user
     */
    assignToUser: (userId, roleId, expiresAt) => {
        return (0, api_js_1.apiFetch)('/api/admin/roles/assign', {
            method: 'POST',
            body: JSON.stringify({ userId, roleId, expiresAt }),
        });
    },
    /**
     * Revoke role from user
     */
    revokeFromUser: (userId, roleId) => {
        return (0, api_js_1.apiFetch)('/api/admin/roles/revoke', {
            method: 'POST',
            body: JSON.stringify({ userId, roleId }),
        });
    },
};
// ============================================================================
// Combined Admin API
// ============================================================================
exports.AdminManagementAPI = {
    users: exports.UserManagementAPI,
    roles: exports.RoleManagementAPI,
};
exports.default = exports.AdminManagementAPI;
