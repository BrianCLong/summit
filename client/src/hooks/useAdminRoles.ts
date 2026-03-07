/**
 * Admin Role Management Hook
 *
 * React hook for role and permission management operations.
 * All responses include GovernanceVerdict.
 *
 * @module hooks/useAdminRoles
 */

import { useCallback, useEffect, useState } from "react";
import {
  RoleManagementAPI,
  Role,
  Permission,
  RoleAssignment,
  CreateRolePayload,
  UpdateRolePayload,
  DataEnvelope,
  RoleListResult,
  PermissionListResult,
  OperationResult,
} from "../services/admin-api";

interface UseAdminRolesState {
  roles: Role[];
  permissions: Permission[];
  permissionCategories: string[];
  userRoles: RoleAssignment[];
  loading: boolean;
  error: string | null;
  selectedRole: Role | null;
}

interface UseAdminRolesReturn extends UseAdminRolesState {
  // Query operations
  refreshRoles: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  loadRole: (roleId: string) => Promise<void>;
  loadUserRoles: (userId: string) => Promise<void>;
  clearSelection: () => void;

  // Mutation operations
  createRole: (payload: CreateRolePayload) => Promise<DataEnvelope<OperationResult> | null>;
  updateRole: (
    roleId: string,
    payload: UpdateRolePayload
  ) => Promise<DataEnvelope<OperationResult> | null>;
  deleteRole: (roleId: string) => Promise<DataEnvelope<OperationResult> | null>;
  assignRoleToUser: (
    userId: string,
    roleId: string,
    expiresAt?: string
  ) => Promise<DataEnvelope<OperationResult> | null>;
  revokeRoleFromUser: (
    userId: string,
    roleId: string
  ) => Promise<DataEnvelope<OperationResult> | null>;
}

export function useAdminRoles(): UseAdminRolesReturn {
  const [state, setState] = useState<UseAdminRolesState>({
    roles: [],
    permissions: [],
    permissionCategories: [],
    userRoles: [],
    loading: false,
    error: null,
    selectedRole: null,
  });

  const fetchRoles = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const envelope: DataEnvelope<RoleListResult> = await RoleManagementAPI.list();

      if (envelope.governanceVerdict.result === "DENY") {
        throw new Error(envelope.governanceVerdict.reason || "Access denied");
      }

      setState((prev) => ({
        ...prev,
        roles: envelope.data.roles,
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load roles";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const envelope: DataEnvelope<PermissionListResult> =
        await RoleManagementAPI.listPermissions();

      if (envelope.governanceVerdict.result === "DENY") {
        throw new Error(envelope.governanceVerdict.reason || "Access denied");
      }

      setState((prev) => ({
        ...prev,
        permissions: envelope.data.permissions,
        permissionCategories: envelope.data.categories,
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load permissions";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const loadRole = useCallback(async (roleId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const envelope: DataEnvelope<Role | null> = await RoleManagementAPI.get(roleId);

      if (envelope.governanceVerdict.result === "DENY") {
        throw new Error(envelope.governanceVerdict.reason || "Access denied");
      }

      setState((prev) => ({
        ...prev,
        selectedRole: envelope.data,
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load role";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const loadUserRoles = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const envelope: DataEnvelope<RoleAssignment[]> = await RoleManagementAPI.getUserRoles(userId);

      if (envelope.governanceVerdict.result === "DENY") {
        throw new Error(envelope.governanceVerdict.reason || "Access denied");
      }

      setState((prev) => ({
        ...prev,
        userRoles: envelope.data,
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load user roles";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const createRole = useCallback(
    async (payload: CreateRolePayload): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await RoleManagementAPI.create(payload);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Refresh roles list
        await fetchRoles();
        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create role";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    [fetchRoles]
  );

  const updateRole = useCallback(
    async (
      roleId: string,
      payload: UpdateRolePayload
    ): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await RoleManagementAPI.update(roleId, payload);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Update local state
        setState((prev) => ({
          ...prev,
          roles: prev.roles.map((r) =>
            r.id === roleId ? { ...r, ...payload, updatedAt: new Date().toISOString() } : r
          ),
          selectedRole:
            prev.selectedRole?.id === roleId
              ? { ...prev.selectedRole, ...payload, updatedAt: new Date().toISOString() }
              : prev.selectedRole,
          loading: false,
        }));

        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update role";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    []
  );

  const deleteRole = useCallback(
    async (roleId: string): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await RoleManagementAPI.delete(roleId);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Remove from local state
        setState((prev) => ({
          ...prev,
          roles: prev.roles.filter((r) => r.id !== roleId),
          selectedRole: prev.selectedRole?.id === roleId ? null : prev.selectedRole,
          loading: false,
        }));

        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete role";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    []
  );

  const assignRoleToUser = useCallback(
    async (
      userId: string,
      roleId: string,
      expiresAt?: string
    ): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await RoleManagementAPI.assignToUser(userId, roleId, expiresAt);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Refresh user roles if currently viewing
        await loadUserRoles(userId);
        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to assign role";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    [loadUserRoles]
  );

  const revokeRoleFromUser = useCallback(
    async (userId: string, roleId: string): Promise<DataEnvelope<OperationResult> | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const envelope = await RoleManagementAPI.revokeFromUser(userId, roleId);

        if (envelope.governanceVerdict.result === "DENY") {
          throw new Error(envelope.governanceVerdict.reason || "Access denied");
        }

        if (!envelope.data.success) {
          throw new Error(envelope.data.message);
        }

        // Remove from local state
        setState((prev) => ({
          ...prev,
          userRoles: prev.userRoles.filter((r) => r.roleId !== roleId),
          loading: false,
        }));

        return envelope;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to revoke role";
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    []
  );

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedRole: null, userRoles: [] }));
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

export default useAdminRoles;
