"use strict";
/**
 * Admin User Management Hook
 *
 * React hook for user management operations with optimistic updates
 * and error handling. All responses include GovernanceVerdict.
 *
 * @module hooks/useAdminUsers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAdminUsers = useAdminUsers;
const react_1 = require("react");
const admin_api_1 = require("../services/admin-api");
function useAdminUsers(initialParams = {}) {
    const [state, setState] = (0, react_1.useState)({
        users: [],
        total: 0,
        page: initialParams.page || 1,
        pageSize: initialParams.pageSize || 25,
        totalPages: 0,
        loading: false,
        error: null,
        selectedUser: null,
    });
    const [filters, setFiltersState] = (0, react_1.useState)(initialParams);
    const fetchUsers = (0, react_1.useCallback)(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const params = {
                ...filters,
                page: state.page,
                pageSize: state.pageSize,
            };
            const envelope = await admin_api_1.UserManagementAPI.list(params);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            setState(prev => ({
                ...prev,
                users: envelope.data.users,
                total: envelope.data.total,
                totalPages: envelope.data.totalPages,
                loading: false,
            }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load users';
            setState(prev => ({ ...prev, loading: false, error: message }));
        }
    }, [filters, state.page, state.pageSize]);
    (0, react_1.useEffect)(() => {
        fetchUsers();
    }, [fetchUsers]);
    const loadUser = (0, react_1.useCallback)(async (userId) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.UserManagementAPI.get(userId);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            setState(prev => ({
                ...prev,
                selectedUser: envelope.data,
                loading: false,
            }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load user';
            setState(prev => ({ ...prev, loading: false, error: message }));
        }
    }, []);
    const createUser = (0, react_1.useCallback)(async (payload) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.UserManagementAPI.create(payload);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Refresh user list
            await fetchUsers();
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create user';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, [fetchUsers]);
    const updateUser = (0, react_1.useCallback)(async (userId, payload) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.UserManagementAPI.update(userId, payload);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Update local state optimistically
            setState(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === userId ? { ...u, ...payload, updatedAt: new Date().toISOString() } : u),
                selectedUser: prev.selectedUser?.id === userId
                    ? { ...prev.selectedUser, ...payload, updatedAt: new Date().toISOString() }
                    : prev.selectedUser,
                loading: false,
            }));
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update user';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);
    const deleteUser = (0, react_1.useCallback)(async (userId, hard = false) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.UserManagementAPI.delete(userId, hard);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Remove from local state or mark inactive
            setState(prev => ({
                ...prev,
                users: hard
                    ? prev.users.filter(u => u.id !== userId)
                    : prev.users.map(u => u.id === userId ? { ...u, isActive: false } : u),
                selectedUser: prev.selectedUser?.id === userId ? null : prev.selectedUser,
                loading: false,
            }));
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete user';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);
    const lockUser = (0, react_1.useCallback)(async (userId, reason) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.UserManagementAPI.lock(userId, reason);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Update local state
            setState(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === userId ? { ...u, isLocked: true, lockReason: reason } : u),
                selectedUser: prev.selectedUser?.id === userId
                    ? { ...prev.selectedUser, isLocked: true, lockReason: reason }
                    : prev.selectedUser,
                loading: false,
            }));
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to lock user';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);
    const unlockUser = (0, react_1.useCallback)(async (userId) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.UserManagementAPI.unlock(userId);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Update local state
            setState(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === userId ? { ...u, isLocked: false, lockReason: undefined } : u),
                selectedUser: prev.selectedUser?.id === userId
                    ? { ...prev.selectedUser, isLocked: false, lockReason: undefined }
                    : prev.selectedUser,
                loading: false,
            }));
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to unlock user';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, []);
    const addToTenant = (0, react_1.useCallback)(async (userId, tenantId, roles) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.UserManagementAPI.addToTenant(userId, tenantId, roles);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Refresh to get updated tenant list
            if (state.selectedUser?.id === userId) {
                await loadUser(userId);
            }
            setState(prev => ({ ...prev, loading: false }));
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add user to tenant';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, [loadUser, state.selectedUser]);
    const removeFromTenant = (0, react_1.useCallback)(async (userId, tenantId) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const envelope = await admin_api_1.UserManagementAPI.removeFromTenant(userId, tenantId);
            if (envelope.governanceVerdict.result === 'DENY') {
                throw new Error(envelope.governanceVerdict.reason || 'Access denied');
            }
            if (!envelope.data.success) {
                throw new Error(envelope.data.message);
            }
            // Refresh to get updated tenant list
            if (state.selectedUser?.id === userId) {
                await loadUser(userId);
            }
            setState(prev => ({ ...prev, loading: false }));
            return envelope;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove user from tenant';
            setState(prev => ({ ...prev, loading: false, error: message }));
            return null;
        }
    }, [loadUser, state.selectedUser]);
    const setPage = (0, react_1.useCallback)((page) => {
        setState(prev => ({ ...prev, page }));
    }, []);
    const setPageSize = (0, react_1.useCallback)((pageSize) => {
        setState(prev => ({ ...prev, pageSize, page: 1 }));
    }, []);
    const setFilters = (0, react_1.useCallback)((newFilters) => {
        setFiltersState(prev => ({ ...prev, ...newFilters }));
        setState(prev => ({ ...prev, page: 1 }));
    }, []);
    const clearSelection = (0, react_1.useCallback)(() => {
        setState(prev => ({ ...prev, selectedUser: null }));
    }, []);
    return {
        ...state,
        refresh: fetchUsers,
        loadUser,
        setPage,
        setPageSize,
        setFilters,
        clearSelection,
        createUser,
        updateUser,
        deleteUser,
        lockUser,
        unlockUser,
        addToTenant,
        removeFromTenant,
    };
}
exports.default = useAdminUsers;
