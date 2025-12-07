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
  status: 'active' | 'suspended' | 'trial' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  settings: Record<string, unknown>; // feature flags, quotas, etc.
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
  | 'create'
  | 'update'
  | 'delete'
  | 'execute'
  | 'administer'
  | 'manage_settings';

export interface ResourceRef {
  type: string; // e.g. "maestro.run", "graph.query", "document"
  id?: string;
  tenantId: TenantId;
  projectId?: ProjectId;
  attributes?: Record<string, unknown>;
}
