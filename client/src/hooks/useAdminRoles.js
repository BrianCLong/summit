"use strict";
/**
 * Admin Role Management Hook
 *
 * React hook for role and permission management operations.
 * All responses include GovernanceVerdict.
 *
 * @module hooks/useAdminRoles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAdminRoles = useAdminRoles;
const react_1 = require("react");
const admin_api_1 = require("../services/admin-api");
function useAdminRoles() {
    const [state, setState] = (0, react_1.useState)({
        roles: [],
        permissions: [],
        permissionCategories: [],
        userRoles: [],
        loading: false,
        error: null,
        selectedRole: null,
    });
    const fetchRoles = (0, react_1.useCallback)(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.RoleManagementAPI.list();
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            setState(prev => ({
                ...prev,
                roles: envelope.data.roles,
                loading: false,
            }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load roles';
            setState(prev => ({ ...prev, loading: false, error: message }));
        }
    }, []);
    const fetchPermissions = (0, react_1.useCallback)(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.RoleManagementAPI.listPermissions();
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            setState(prev => ({
                ...prev,
                permissions: envelope.data.permissions,
                permissionCategories: envelope.data.categories,
                loading: false,
            }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load permissions';
            setState(prev => ({ ...prev, loading: false, error: message }));
        }
    }, []);
    (0, react_1.useEffect)(() => {
        fetchRoles();
        fetchPermissions();
    }, [fetchRoles, fetchPermissions]);
    const loadRole = (0, react_1.useCallback)(async (roleId) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.RoleManagementAPI.get(roleId);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            setState(prev => ({
                ...prev,
                selectedRole: envelope.data,
                loading: false,
            }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load role';
            setState(prev => ({ ...prev, loading: false, error: message }));
        }
    }, []);
    const loadUserRoles = (0, react_1.useCallback)(async (userId) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.RoleManagementAPI.getUserRoles(userId);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            setState(prev => ({
                ...prev,
                userRoles: envelope.data,
                loading: false,
            }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load user roles';
            setState(prev => ({ ...prev, loading: false, error: message }));
        }
    }, []);
    const createRole = (0, react_1.useCallback)(async (payload) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.RoleManagementAPI.create(payload);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Refresh roles list
            await fetchRoles();
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create role';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, [fetchRoles]);
    const updateRole = (0, react_1.useCallback)(async (roleId, payload) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.RoleManagementAPI.update(roleId, payload);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Update local state
            setState(prev => ({
                ...prev,
                roles: prev.roles.map(r => r.id === roleId ? { ...r, ...payload, updatedAt: new Date().toISOString() } : r),
                selectedRole: prev.selectedRole?.id === roleId
                    ? { ...prev.selectedRole, ...payload, updatedAt: new Date().toISOString() }
                    : prev.selectedRole,
                loading: false,
            }));
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update role';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);
    const deleteRole = (0, react_1.useCallback)(async (roleId) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.RoleManagementAPI.delete(roleId);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Remove from local state
            setState(prev => ({
                ...prev,
                roles: prev.roles.filter(r => r.id !== roleId),
                selectedRole: prev.selectedRole?.id === roleId ? null : prev.selectedRole,
                loading: false,
            }));
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete role';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);
    const assignRoleToUser = (0, react_1.useCallback)(async (userId, roleId, expiresAt) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.RoleManagementAPI.assignToUser(userId, roleId, expiresAt);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Refresh user roles if currently viewing
            await loadUserRoles(userId);
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to assign role';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, [loadUserRoles]);
    const revokeRoleFromUser = (0, react_1.useCallback)(async (userId, roleId) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.RoleManagementAPI.revokeFromUser(userId, roleId);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Remove from local state
            setState(prev => ({
                ...prev,
                userRoles: prev.userRoles.filter(r => r.roleId !== roleId),
                loading: false,
            }));
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to revoke role';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);
    const clearSelection = (0, react_1.useCallback)(() => {
        setState(prev => ({ ...prev, selectedRole: null, userRoles: [] }));
    }, []);
    return {
        ...state,
        refreshRoles: fetchRoles,
        refreshPermissions: fetchPermissions,
        loadRole,
        loadUserRoles,
        clearSelection,
        createRole,
        updateRole,
        deleteRole,
        assignRoleToUser,
        revokeRoleFromUser,
    };
}
exports.default = useAdminRoles;
