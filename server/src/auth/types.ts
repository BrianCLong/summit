export type TenantId = string;
export type UserId = string;
export type RoleId = string;
export type Scope = string;

/**
 * Standard Role Keys
 * These map to sets of permissions in the authorization layer.
 */
export type RoleKey =
  | 'tenant.admin'      // Full access to tenant resources
  | 'tenant.developer'  // Can manage resources (runs, tasks) but not tenant config
  | 'tenant.viewer'     // Read-only access to tenant resources
  | 'ops.sre'           // Platform operator (limited cross-tenant)
  | 'ops.security'      // Security auditor (audit logs access)
  | 'system.internal'   // Internal system services (e.g., workers)
  // Legacy roles for backward compatibility (mapped to new roles)
  | 'ADMIN'
  | 'ANALYST'
  | 'VIEWER';

/**
 * Authentication Method
 */
export type AuthMethod =
  | 'session'  // Browser session / Cookie
  | 'jwt'      // Bearer token (OIDC/OAuth)
  | 'apiKey'   // API Key (machine-to-machine)
  | 'system';  // Internal system call

/**
 * The Identity of the caller.
 * This object is attached to every authenticated request.
 */
export interface Principal {
  id: UserId;
  email?: string;

  /**
   * The primary tenant context for this request.
   * For system principals, this might be a specific tenant they are operating on behalf of.
   */
  tenantId: TenantId;

  /**
   * List of all tenants this user has access to.
   * Useful for UI switching or cross-tenant aggregation (if allowed).
   */
  tenantIds?: TenantId[];

  /**
   * Assigned roles.
   * These drive the coarse-grained authorization.
   */
  roles: RoleKey[];

  /**
   * Derived scopes/permissions.
   * These drive the fine-grained authorization (can('runs.read')).
   */
  scopes: Scope[];

  /**
   * True if this is a machine/system principal, not a human user.
   */
  isSystem?: boolean;

  /**
   * Metadata about the authentication method.
   */
  authMethod: AuthMethod;

  /**
   * Session ID (if applicable) for audit logging.
   */
  sessionId?: string;
}

/**
 * Request context extension
 */
declare global {
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}
