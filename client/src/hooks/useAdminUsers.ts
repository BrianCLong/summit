/**
 * Admin User Management Hook
 *
 * React hook for user management operations with optimistic updates
 * and error handling. All responses include GovernanceVerdict.
 *
 * @module hooks/useAdminUsers
 */

import { useCallback, useEffect, useState } from "react";
import {
  UserManagementAPI,
  ManagedUser,
  ListUsersParams,
  CreateUserPayload,
  UpdateUserPayload,
  DataEnvelope,
  UserListResult,
  OperationResult,
} from "../services/admin-api";

interface UseAdminUsersState {
  users: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  selectedUser: ManagedUser | null;
}

interface UseAdminUsersReturn extends UseAdminUsersState {
  // Query operations
  refresh: () => Promise<void>;
  loadUser: (userId: string) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilters: (filters: Partial<ListUsersParams>) => void;
  clearSelection: () => void;

  // Mutation operations
  createUser: (payload: CreateUserPayload) => Promise<DataEnvelope<OperationResult> | null>;
  updateUser: (
    userId: string,
    payload: UpdateUserPayload
  ) => Promise<DataEnvelope<OperationResult> | null>;
  deleteUser: (userId: string, hard?: boolean) => Promise<DataEnvelope<OperationResult> | null>;
  lockUser: (userId: string, reason: string) => Promise<DataEnvelope<OperationResult> | null>;
  unlockUser: (userId: string) => Promise<DataEnvelope<OperationResult> | null>;
  addToTenant: (
    userId: string,
    tenantId: string,
    roles: string[]
  ) => Promise<DataEnvelope<OperationResult> | null>;
  removeFromTenant: (
    userId: string,
    tenantId: string
  ) => Promise<DataEnvelope<OperationResult> | null>;
}

export function useAdminUsers(initialParams: ListUsersParams = {}): UseAdminUsersReturn {
  const [state, setState] = useState<UseAdminUsersState>({
    users: [],
    total: 0,
    page: initialParams.page || 1,
    pageSize: initialParams.pageSize || 25,
    totalPages: 0,
    loading: false,
    error: null,
    selectedUser: null,
  });

  const [filters, setFiltersState] = useState<ListUsersParams>(initialParams);

  const fetchUsers = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params: ListUsersParams = {
        ...filters,
        page: state.page,
        pageSize: state.pageSize,
      };
      const envelope: DataEnvelope<UserListResult> = await UserManagementAPI.list(params);

      if (envelope.governanceVerdict.result === "DENY") {
        throw new Error(envelope.governanceVerdict.reason || "Access denied");
      }

      setState((prev) => ({
        ...prev,
        users: envelope.data.users,
        total: envelope.data.total,
        totalPages: envelope.data.totalPages,
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [filters, state.page, state.pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const loadUser = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const envelope: DataEnvelope<ManagedUser | null> = await UserManagementAPI.get(userId);

      if (envelope.governanceVerdict.result === "DENY") {
        throw new Error(envelope.governanceVerdict.reason || "Access denied");
      }

      setState((prev) => ({
        ...prev,
        selectedUser: envelope.data,
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load user";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const createUser = useCallback(
    async (payload: CreateUserPayload): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await UserManagementAPI.create(payload);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Refresh user list
        await fetchUsers();
        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create user";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    [fetchUsers]
  );

  const updateUser = useCallback(
    async (
      userId: string,
      payload: UpdateUserPayload
    ): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await UserManagementAPI.update(userId, payload);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Update local state optimistically
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId ? { ...u, ...payload, updatedAt: new Date().toISOString() } : u
          ),
          selectedUser:
            prev.selectedUser?.id === userId
              ? { ...prev.selectedUser, ...payload, updatedAt: new Date().toISOString() }
              : prev.selectedUser,
          loading: false,
        }));

        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update user";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    []
  );

  const deleteUser = useCallback(
    async (userId: string, hard = false): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await UserManagementAPI.delete(userId, hard);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Remove from local state or mark inactive
        setState((prev) => ({
          ...prev,
          users: hard
            ? prev.users.filter((u) => u.id !== userId)
            : prev.users.map((u) => (u.id === userId ? { ...u, isActive: false } : u)),
          selectedUser: prev.selectedUser?.id === userId ? null : prev.selectedUser,
          loading: false,
        }));

        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete user";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    []
  );

  const lockUser = useCallback(
    async (userId: string, reason: string): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await UserManagementAPI.lock(userId, reason);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Update local state
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId ? { ...u, isLocked: true, lockReason: reason } : u
          ),
          selectedUser:
            prev.selectedUser?.id === userId
              ? { ...prev.selectedUser, isLocked: true, lockReason: reason }
              : prev.selectedUser,
          loading: false,
        }));

        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to lock user";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    []
  );

  const unlockUser = useCallback(
    async (userId: string): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await UserManagementAPI.unlock(userId);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Update local state
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId ? { ...u, isLocked: false, lockReason: undefined } : u
          ),
          selectedUser:
            prev.selectedUser?.id === userId
              ? { ...prev.selectedUser, isLocked: false, lockReason: undefined }
              : prev.selectedUser,
          loading: false,
        }));

        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to unlock user";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    []
  );

  const addToTenant = useCallback(
    async (
      userId: string,
      tenantId: string,
      roles: string[]
    ): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await UserManagementAPI.addToTenant(userId, tenantId, roles);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Refresh to get updated tenant list
        if (state.selectedUser?.id === userId) {
          await loadUser(userId);
        }

        setState((prev) => ({ ...prev, loading: false }));
        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to add user to tenant";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    [loadUser, state.selectedUser]
  );

  const removeFromTenant = useCallback(
    async (userId: string, tenantId: string): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await UserManagementAPI.removeFromTenant(userId, tenantId);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Refresh to get updated tenant list
        if (state.selectedUser?.id === userId) {
          await loadUser(userId);
        }

        setState((prev) => ({ ...prev, loading: false }));
        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to remove user from tenant";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    [loadUser, state.selectedUser]
  );

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setState((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<ListUsersParams>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setState((prev) => ({ ...prev, page: 1 }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedUser: null }));
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

export default useAdminUsers;
