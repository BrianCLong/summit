export type TenantId = string;
export type UserId = string;
export type ApiKeyId = string;
export type ServiceAccountId = string;
export type ProjectId = string;

export type PrincipalKind = 'user' | 'api_key' | 'service_account' | 'system';

export interface Principal {
  kind: PrincipalKind;
  id: string;
  tenantId: TenantId;
  roles: string[]; // e.g. ["tenant_admin", "analyst"]
  scopes: string[]; // fine-grained, e.g. ["graph:read", "maestro:runs.write"]
  metadata?: Record<string, unknown>;
  user?: {
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface Tenant {
  id: TenantId;
  name: string;
  slug: string;
  region?: string; // e.g. 'us-east-1'
  residency?: 'US' | 'EU';
  tier?: string;
  status: 'active' | 'suspended' | 'trial' | 'closed';
  config?: Record<string, unknown>;
  settings: Record<string, unknown>; // feature flags, quotas, etc.
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: ProjectId;
  tenantId: TenantId;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantMembership {
  userId: UserId;
  tenantId: TenantId;
  roles: string[]; // e.g. ["tenant_admin", "analyst"]
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: ApiKeyId;
  tenantId: TenantId;
  keyPrefix: string; // full key shown only at creation
  hashedSecret: string;
  label: string;
  scopes: string[];
  createdByUserId?: UserId;
  createdAt: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
}

export interface ServiceAccount {
  id: ServiceAccountId;
  tenantId: TenantId;
  name: string;
  description?: string;
  roles: string[];
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type Action =
  | 'view'
  | 'read' // Alias for view, used in analytics/compliance routes
  | 'create'
  | 'update'
  | 'delete'
  | 'execute'
  | 'administer'
  | 'admin' // Alias for administer, used in admin routes
  | 'manage' // For role/user/policy management
  | 'manage_settings'
  | 'assign' // Role assignment
  | 'revoke' // Role revocation
  | 'lock' // User lock
  | 'unlock' // User unlock
  | 'submit' // Policy submission
  | 'approve' // Policy approval
  | 'publish' // Policy publishing
  | 'simulate'; // Policy simulation

export interface ResourceRef {
  type: string; // e.g. "maestro.run", "graph.query", "document"
  id?: string;
  tenantId: TenantId;
  projectId?: ProjectId;
  attributes?: Record<string, unknown>;
}
