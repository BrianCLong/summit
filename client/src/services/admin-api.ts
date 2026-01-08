/**
 * Admin API Client
 *
 * API client for user and role management operations.
 * All responses are DataEnvelopes with GovernanceVerdict metadata.
 *
 * @module services/admin-api
 */

import { apiFetch } from "./api.js";

// ============================================================================
// Types
// ============================================================================

export interface ManagedUser {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  tenantId: string;
  tenantIds: string[];
  isActive: boolean;
  isLocked: boolean;
  lockReason?: string;
  lastLogin?: string;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface UserListResult {
  users: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  effectivePermissions: string[];
  inherits: string[];
  isSystem: boolean;
  isBuiltIn: boolean;
  scope: "full" | "restricted" | "readonly";
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface RoleListResult {
  roles: Role[];
  total: number;
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  resource: string;
  action: string;
  category: string;
  isSystem: boolean;
}

export interface PermissionListResult {
  permissions: Permission[];
  categories: string[];
  total: number;
}

export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  tenantId: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface OperationResult {
  success: boolean;
  message: string;
  user?: ManagedUser;
  role?: Role;
}

export interface GovernanceVerdict {
  verdictId: string;
  policyId: string;
  result: "ALLOW" | "DENY" | "FLAG" | "REVIEW_REQUIRED";
  decidedAt: string;
  reason?: string;
  evaluator: string;
}

export interface DataEnvelope<T> {
  data: T;
  provenance: {
    source: string;
    generatedAt: string;
    provenanceId: string;
    actor?: string;
  };
  governanceVerdict: GovernanceVerdict;
  classification: string;
  dataHash: string;
  isSimulated: boolean;
  warnings: string[];
}

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  sortBy?: "email" | "firstName" | "lastName" | "createdAt" | "lastLogin";
  sortOrder?: "asc" | "desc";
}

export interface CreateUserPayload {
  email: string;
  username?: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  tenantId?: string;
}

export interface UpdateUserPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}

export interface CreateRolePayload {
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  inherits?: string[];
  scope?: "full" | "restricted" | "readonly";
}

export interface UpdateRolePayload {
  displayName?: string;
  description?: string;
  permissions?: string[];
  inherits?: string[];
  scope?: "full" | "restricted" | "readonly";
}

// ============================================================================
// User Management API
// ============================================================================

export const UserManagementAPI = {
  /**
   * List users with pagination and filtering
   */
  list: (params: ListUsersParams = {}): Promise<DataEnvelope<UserListResult>> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    if (params.sortBy) qs.set("sortBy", params.sortBy);
    if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
    const query = qs.toString();
    return apiFetch(`/api/admin/users${query ? `?${query}` : ""}`);
  },

  /**
   * Get a specific user by ID
   */
  get: (userId: string): Promise<DataEnvelope<ManagedUser | null>> => {
    return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`);
  },

  /**
   * Create a new user
   */
  create: (payload: CreateUserPayload): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update a user
   */
  update: (userId: string, payload: UpdateUserPayload): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete (deactivate) a user
   */
  delete: (userId: string, hard = false): Promise<DataEnvelope<OperationResult>> => {
    const qs = hard ? "?hard=true" : "";
    return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}${qs}`, {
      method: "DELETE",
    });
  },

  /**
   * Lock a user account
   */
  lock: (userId: string, reason: string): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/lock`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Unlock a user account
   */
  unlock: (userId: string): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/unlock`, {
      method: "POST",
    });
  },

  /**
   * Add user to tenant
   */
  addToTenant: (
    userId: string,
    tenantId: string,
    roles: string[]
  ): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/tenants`, {
      method: "POST",
      body: JSON.stringify({ tenantId, roles }),
    });
  },

  /**
   * Remove user from tenant
   */
  removeFromTenant: (userId: string, tenantId: string): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch(
      `/api/admin/users/${encodeURIComponent(userId)}/tenants/${encodeURIComponent(tenantId)}`,
      {
        method: "DELETE",
      }
    );
  },
};

// ============================================================================
// Role Management API
// ============================================================================

export const RoleManagementAPI = {
  /**
   * List all roles
   */
  list: (): Promise<DataEnvelope<RoleListResult>> => {
    return apiFetch("/api/admin/roles");
  },

  /**
   * Get a specific role by ID
   */
  get: (roleId: string): Promise<DataEnvelope<Role | null>> => {
    return apiFetch(`/api/admin/roles/${encodeURIComponent(roleId)}`);
  },

  /**
   * Create a custom role
   */
  create: (payload: CreateRolePayload): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch("/api/admin/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update a custom role
   */
  update: (roleId: string, payload: UpdateRolePayload): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch(`/api/admin/roles/${encodeURIComponent(roleId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete a custom role
   */
  delete: (roleId: string): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch(`/api/admin/roles/${encodeURIComponent(roleId)}`, {
      method: "DELETE",
    });
  },

  /**
   * List all available permissions
   */
  listPermissions: (): Promise<DataEnvelope<PermissionListResult>> => {
    return apiFetch("/api/admin/roles/permissions/list");
  },

  /**
   * Get user's role assignments
   */
  getUserRoles: (userId: string): Promise<DataEnvelope<RoleAssignment[]>> => {
    return apiFetch(`/api/admin/roles/users/${encodeURIComponent(userId)}`);
  },

  /**
   * Assign role to user
   */
  assignToUser: (
    userId: string,
    roleId: string,
    expiresAt?: string
  ): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch("/api/admin/roles/assign", {
      method: "POST",
      body: JSON.stringify({ userId, roleId, expiresAt }),
    });
  },

  /**
   * Revoke role from user
   */
  revokeFromUser: (userId: string, roleId: string): Promise<DataEnvelope<OperationResult>> => {
    return apiFetch("/api/admin/roles/revoke", {
      method: "POST",
      body: JSON.stringify({ userId, roleId }),
    });
  },
};

// ============================================================================
// Combined Admin API
// ============================================================================

export const AdminManagementAPI = {
  users: UserManagementAPI,
  roles: RoleManagementAPI,
};

export default AdminManagementAPI;
