/**
 * Multi-Tenant RBAC (Role-Based Access Control) System
 *
 * Implements IC-grade multi-tenancy with:
 * - Tenant isolation enforcement
 * - Hierarchical role inheritance
 * - OPA policy integration
 * - Attribute-based access control extensions
 * - Denied environment handling
 *
 * @module auth/multi-tenant-rbac
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../config/logger.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TenantConfig {
  id: string;
  name: string;
  classification: 'unclassified' | 'cui' | 'secret' | 'top-secret';
  deniedEnvironments: string[];
  allowedRegions: string[];
  maxUsers: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MultiTenantUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  tenantIds: string[];  // User can belong to multiple tenants
  primaryTenantId: string;
  roles: TenantRole[];
  globalRoles: string[];
  attributes: UserAttributes;
  clearanceLevel: ClearanceLevel;
  lastAuthenticated: Date;
  mfaVerified: boolean;
  sessionId?: string;
}

export interface TenantRole {
  tenantId: string;
  role: string;
  permissions: string[];
  scope: 'full' | 'restricted' | 'readonly';
  expiresAt?: Date;
  grantedBy: string;
  grantedAt: Date;
}

export interface UserAttributes {
  department?: string;
  division?: string;
  location?: string;
  clearance?: string;
  caveats?: string[];
  needToKnow?: string[];
  specialAccess?: string[];
  otAuthorization?: boolean;
}

export type ClearanceLevel =
  | 'unclassified'
  | 'confidential'
  | 'secret'
  | 'top-secret'
  | 'top-secret-sci';

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  tenantId: string;
  userId: string;
  resource: string;
  action: string;
  timestamp: Date;
  obligations?: AccessObligation[];
  auditRequired: boolean;
  stepUpRequired: boolean;
}

export interface AccessObligation {
  type: 'audit' | 'notify' | 'encrypt' | 'redact' | 'two-person';
  parameters: Record<string, unknown>;
}

export interface ResourceContext {
  type: string;
  id: string;
  tenantId: string;
  classification?: string;
  tags?: string[];
  owner?: string;
}

export interface RBACConfig {
  enabled: boolean;
  enforceTenantIsolation: boolean;
  allowCrossTenantAccess: boolean;
  requireMfaForSensitive: boolean;
  auditAllAccess: boolean;
  maxSessionDuration: number;
  stepUpAuthTTL: number;
  deniedEnvironments: string[];
}

// ============================================================================
// Default Role Definitions
// ============================================================================

const DEFAULT_ROLES: Record<string, { permissions: string[]; inherits?: string[] }> = {
  'global-admin': {
    permissions: ['*'],
    inherits: [],
  },
  'tenant-admin': {
    permissions: [
      'tenant:manage',
      'user:read', 'user:create', 'user:update', 'user:delete',
      'role:assign', 'role:revoke',
      'audit:read', 'audit:export',
      'config:read', 'config:update',
    ],
    inherits: ['supervisor'],
  },
  'supervisor': {
    permissions: [
      'investigation:read', 'investigation:create', 'investigation:update', 'investigation:delete',
      'entity:read', 'entity:create', 'entity:update', 'entity:delete',
      'relationship:read', 'relationship:create', 'relationship:update', 'relationship:delete',
      'analytics:run', 'analytics:export',
      'report:read', 'report:create', 'report:export',
      'team:manage',
    ],
    inherits: ['analyst'],
  },
  'analyst': {
    permissions: [
      'investigation:read', 'investigation:create', 'investigation:update',
      'entity:read', 'entity:create', 'entity:update',
      'relationship:read', 'relationship:create', 'relationship:update',
      'analytics:run',
      'report:read', 'report:create',
      'copilot:query', 'copilot:analyze',
    ],
    inherits: ['viewer'],
  },
  'viewer': {
    permissions: [
      'investigation:read',
      'entity:read',
      'relationship:read',
      'analytics:view',
      'report:read',
      'dashboard:view',
    ],
    inherits: [],
  },
  'compliance-officer': {
    permissions: [
      'audit:read', 'audit:export',
      'report:read', 'report:export',
      'policy:read',
      'sensitive:read',
      'dlp:override',
    ],
    inherits: ['viewer'],
  },
  'ot-integrator': {
    permissions: [
      'ot:read', 'ot:write', 'ot:configure',
      'data:ingest', 'data:transform',
      'pipeline:read', 'pipeline:execute',
    ],
    inherits: ['viewer'],
  },
};

// ============================================================================
// Multi-Tenant RBAC Manager
// ============================================================================

export class MultiTenantRBACManager {
  private config: RBACConfig;
  private roleDefinitions: Map<string, { permissions: Set<string>; inherits: string[] }>;
  private tenantCache: Map<string, TenantConfig>;
  private permissionCache: Map<string, Set<string>>;
  private opaClient?: OPAClient;

  constructor(config?: Partial<RBACConfig>, opaClient?: OPAClient) {
    this.config = {
      enabled: true,
      enforceTenantIsolation: true,
      allowCrossTenantAccess: false,
      requireMfaForSensitive: true,
      auditAllAccess: true,
      maxSessionDuration: 8 * 60 * 60 * 1000, // 8 hours
      stepUpAuthTTL: 5 * 60 * 1000, // 5 minutes
      deniedEnvironments: [],
      ...config,
    };

    this.roleDefinitions = new Map();
    this.tenantCache = new Map();
    this.permissionCache = new Map();
    this.opaClient = opaClient;

    this.initializeRoles();
    this.loadDeniedEnvironments();

    logger.info('Multi-tenant RBAC manager initialized', {
      enabled: this.config.enabled,
      enforceTenantIsolation: this.config.enforceTenantIsolation,
      deniedEnvironments: this.config.deniedEnvironments.length,
    });
  }

  private initializeRoles(): void {
    // Build role hierarchy with permission inheritance
    for (const [roleName, roleDef] of Object.entries(DEFAULT_ROLES)) {
      const allPermissions = new Set<string>(roleDef.permissions);

      // Resolve inherited permissions
      const resolveInherited = (role: string, visited: Set<string>): void => {
        if (visited.has(role)) return; // Prevent cycles
        visited.add(role);

        const inherited = DEFAULT_ROLES[role];
        if (inherited) {
          inherited.permissions.forEach(p => allPermissions.add(p));
          inherited.inherits?.forEach(r => resolveInherited(r, visited));
        }
      };

      roleDef.inherits?.forEach(r => resolveInherited(r, new Set()));

      this.roleDefinitions.set(roleName, {
        permissions: allPermissions,
        inherits: roleDef.inherits || [],
      });
    }

    logger.debug('RBAC roles initialized', {
      roles: Array.from(this.roleDefinitions.keys()),
    });
  }

  private loadDeniedEnvironments(): void {
    // Load denied environments from environment variable
    const deniedEnvs = process.env.DENIED_ENVIRONMENTS;
    if (deniedEnvs) {
      this.config.deniedEnvironments = deniedEnvs.split(',').map(e => e.trim());
    }

    // Also check for OT integrations that should be denied
    const deniedOT = process.env.DENIED_OT_SYSTEMS;
    if (deniedOT) {
      const otSystems = deniedOT.split(',').map(s => `ot:${s.trim()}`);
      this.config.deniedEnvironments.push(...otSystems);
    }
  }

  /**
   * Register a tenant configuration
   */
  registerTenant(tenant: TenantConfig): void {
    this.tenantCache.set(tenant.id, tenant);
    logger.info('Tenant registered', {
      tenantId: tenant.id,
      classification: tenant.classification,
    });
  }

  /**
   * Get tenant configuration
   */
  getTenant(tenantId: string): TenantConfig | undefined {
    return this.tenantCache.get(tenantId);
  }

  /**
   * Check if user has permission in tenant context
   */
  hasPermission(
    user: MultiTenantUser,
    permission: string,
    tenantId?: string
  ): boolean {
    if (!this.config.enabled) return true;

    const effectiveTenantId = tenantId || user.tenantId;
    const cacheKey = `${user.id}:${effectiveTenantId}:${permission}`;

    // Check if access is denied by environment
    if (this.isEnvironmentDenied(permission)) {
      return false;
    }

    // Global admin bypass
    if (user.globalRoles.includes('global-admin')) {
      return true;
    }

    // Get user's roles for the tenant
    const tenantRoles = user.roles.filter(r => r.tenantId === effectiveTenantId);

    if (tenantRoles.length === 0) {
      logger.debug('No roles found for tenant', {
        userId: user.id,
        tenantId: effectiveTenantId,
      });
      return false;
    }

    // Check each role's permissions
    for (const role of tenantRoles) {
      // Check if role has expired
      if (role.expiresAt && role.expiresAt < new Date()) {
        continue;
      }

      const roleDef = this.roleDefinitions.get(role.role);
      if (!roleDef) continue;

      // Wildcard check
      if (roleDef.permissions.has('*')) {
        return true;
      }

      // Exact permission check
      if (roleDef.permissions.has(permission)) {
        return true;
      }

      // Resource wildcard check (e.g., entity:* matches entity:read)
      const [resource, action] = permission.split(':');
      if (roleDef.permissions.has(`${resource}:*`)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if environment/action is denied
   */
  private isEnvironmentDenied(permission: string): boolean {
    return this.config.deniedEnvironments.some(env =>
      permission.startsWith(env) || permission === env
    );
  }

  /**
   * Evaluate access decision with full context
   */
  async evaluateAccess(
    user: MultiTenantUser,
    resource: ResourceContext,
    action: string
  ): Promise<AccessDecision> {
    const startTime = Date.now();
    const permission = `${resource.type}:${action}`;

    // Base decision
    const decision: AccessDecision = {
      allowed: false,
      reason: '',
      tenantId: resource.tenantId,
      userId: user.id,
      resource: `${resource.type}:${resource.id}`,
      action,
      timestamp: new Date(),
      obligations: [],
      auditRequired: this.config.auditAllAccess,
      stepUpRequired: false,
    };

    // Check tenant isolation
    if (this.config.enforceTenantIsolation) {
      if (!this.checkTenantIsolation(user, resource.tenantId)) {
        decision.reason = 'Tenant isolation violation';
        this.logAccessDecision(decision, Date.now() - startTime);
        return decision;
      }
    }

    // Check clearance level
    if (resource.classification) {
      if (!this.checkClearance(user, resource.classification)) {
        decision.reason = 'Insufficient clearance level';
        this.logAccessDecision(decision, Date.now() - startTime);
        return decision;
      }
    }

    // Check MFA for sensitive operations
    if (this.requiresStepUp(action, resource)) {
      if (!user.mfaVerified) {
        decision.stepUpRequired = true;
        decision.reason = 'Step-up authentication required';
        this.logAccessDecision(decision, Date.now() - startTime);
        return decision;
      }
    }

    // Check RBAC permission
    if (!this.hasPermission(user, permission, resource.tenantId)) {
      decision.reason = 'Insufficient permissions';
      this.logAccessDecision(decision, Date.now() - startTime);
      return decision;
    }

    // If OPA client is configured, delegate to OPA for advanced policy
    if (this.opaClient) {
      const opaDecision = await this.evaluateOPAPolicy(user, resource, action);
      if (!opaDecision.allowed) {
        decision.reason = opaDecision.reason || 'Policy violation';
        decision.obligations = opaDecision.obligations;
        this.logAccessDecision(decision, Date.now() - startTime);
        return decision;
      }
      decision.obligations = opaDecision.obligations;
    }

    // Access granted
    decision.allowed = true;
    decision.reason = 'Access granted';

    // Add audit obligation for sensitive resources
    if (resource.classification && resource.classification !== 'unclassified') {
      decision.obligations = decision.obligations || [];
      decision.obligations.push({
        type: 'audit',
        parameters: {
          level: 'sensitive',
          classification: resource.classification,
        },
      });
    }

    this.logAccessDecision(decision, Date.now() - startTime);
    return decision;
  }

  /**
   * Check tenant isolation
   */
  private checkTenantIsolation(user: MultiTenantUser, resourceTenantId: string): boolean {
    // Global admin can access all tenants
    if (user.globalRoles.includes('global-admin')) {
      return true;
    }

    // Check if user belongs to the resource's tenant
    return user.tenantIds.includes(resourceTenantId);
  }

  /**
   * Check clearance level
   */
  private checkClearance(user: MultiTenantUser, requiredClassification: string): boolean {
    const clearanceLevels: Record<string, number> = {
      'unclassified': 0,
      'confidential': 1,
      'secret': 2,
      'top-secret': 3,
      'top-secret-sci': 4,
    };

    const userLevel = clearanceLevels[user.clearanceLevel] ?? 0;
    const requiredLevel = clearanceLevels[requiredClassification] ?? 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Check if action requires step-up authentication
   */
  private requiresStepUp(action: string, resource: ResourceContext): boolean {
    const sensitiveActions = [
      'delete', 'bulk_delete', 'export', 'bulk_export',
      'admin_action', 'user_management', 'config_change',
    ];

    const sensitiveClassifications = ['secret', 'top-secret', 'top-secret-sci'];

    return (
      sensitiveActions.includes(action) ||
      (resource.classification && sensitiveClassifications.includes(resource.classification))
    );
  }

  /**
   * Evaluate OPA policy
   */
  private async evaluateOPAPolicy(
    user: MultiTenantUser,
    resource: ResourceContext,
    action: string
  ): Promise<{ allowed: boolean; reason?: string; obligations?: AccessObligation[] }> {
    if (!this.opaClient) {
      return { allowed: true };
    }

    const input = {
      user: {
        id: user.id,
        tenant_id: user.tenantId,
        roles: user.roles.map(r => r.role),
        clearance: user.clearanceLevel,
        attributes: user.attributes,
        mfa_verified: user.mfaVerified,
      },
      resource: {
        type: resource.type,
        id: resource.id,
        tenant_id: resource.tenantId,
        classification: resource.classification,
        tags: resource.tags,
      },
      action,
      context: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    };

    return this.opaClient.evaluate(input);
  }

  /**
   * Log access decision for audit
   */
  private logAccessDecision(decision: AccessDecision, durationMs: number): void {
    const logData = {
      allowed: decision.allowed,
      reason: decision.reason,
      userId: decision.userId,
      tenantId: decision.tenantId,
      resource: decision.resource,
      action: decision.action,
      durationMs,
      stepUpRequired: decision.stepUpRequired,
    };

    if (decision.allowed) {
      logger.debug('Access decision: ALLOWED', logData);
    } else {
      logger.warn('Access decision: DENIED', logData);
    }
  }

  /**
   * Get user's effective permissions for a tenant
   */
  getEffectivePermissions(user: MultiTenantUser, tenantId?: string): string[] {
    const effectiveTenantId = tenantId || user.tenantId;
    const permissions = new Set<string>();

    // Add permissions from global roles
    for (const globalRole of user.globalRoles) {
      const roleDef = this.roleDefinitions.get(globalRole);
      if (roleDef) {
        roleDef.permissions.forEach(p => permissions.add(p));
      }
    }

    // Add permissions from tenant roles
    for (const role of user.roles.filter(r => r.tenantId === effectiveTenantId)) {
      // Skip expired roles
      if (role.expiresAt && role.expiresAt < new Date()) {
        continue;
      }

      const roleDef = this.roleDefinitions.get(role.role);
      if (roleDef) {
        roleDef.permissions.forEach(p => permissions.add(p));
      }

      // Add direct permissions from role assignment
      role.permissions.forEach(p => permissions.add(p));
    }

    // Filter out denied environments
    return Array.from(permissions).filter(p => !this.isEnvironmentDenied(p));
  }

  /**
   * Add custom role definition
   */
  addRole(name: string, permissions: string[], inherits?: string[]): void {
    const allPermissions = new Set<string>(permissions);

    if (inherits) {
      for (const inheritedRole of inherits) {
        const inherited = this.roleDefinitions.get(inheritedRole);
        if (inherited) {
          inherited.permissions.forEach(p => allPermissions.add(p));
        }
      }
    }

    this.roleDefinitions.set(name, {
      permissions: allPermissions,
      inherits: inherits || [],
    });

    logger.info('Custom role added', { name, permissions: permissions.length });
  }

  /**
   * Get configuration
   */
  getConfig(): RBACConfig {
    return { ...this.config };
  }
}

// ============================================================================
// OPA Client Interface
// ============================================================================

export interface OPAClient {
  evaluate(input: Record<string, unknown>): Promise<{
    allowed: boolean;
    reason?: string;
    obligations?: AccessObligation[];
  }>;
}

// ============================================================================
// Express Middleware
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user: MultiTenantUser;
  tenantId?: string;
  accessDecision?: AccessDecision;
}

/**
 * Create multi-tenant authentication middleware
 */
export function createMultiTenantAuth(rbac: MultiTenantRBACManager) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Validate tenant context
      const tenantId = req.headers['x-tenant-id'] as string || user.tenantId;

      if (rbac.getConfig().enforceTenantIsolation) {
        if (!user.tenantIds.includes(tenantId)) {
          logger.warn('Tenant access denied', {
            userId: user.id,
            requestedTenant: tenantId,
            userTenants: user.tenantIds,
          });

          res.status(403).json({
            error: 'Access to tenant denied',
            code: 'TENANT_ACCESS_DENIED',
          });
          return;
        }
      }

      // Attach tenant context
      (req as AuthenticatedRequest).tenantId = tenantId;

      next();
    } catch (error) {
      logger.error('Multi-tenant auth middleware error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR',
      });
    }
  };
}

/**
 * Create permission check middleware
 */
export function requireTenantPermission(rbac: MultiTenantRBACManager, permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const tenantId = authReq.tenantId || user.tenantId;

      if (!rbac.hasPermission(user, permission, tenantId)) {
        logger.warn('Permission denied', {
          userId: user.id,
          tenantId,
          permission,
        });

        res.status(403).json({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permission,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check middleware error', {
        error: error instanceof Error ? error.message : String(error),
        permission,
      });
      res.status(500).json({
        error: 'Authorization service error',
        code: 'AUTHZ_SERVICE_ERROR',
      });
    }
  };
}

/**
 * Create resource access middleware with full policy evaluation
 */
export function requireResourceAccess(
  rbac: MultiTenantRBACManager,
  resourceType: string,
  action: string,
  getResourceId: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const tenantId = authReq.tenantId || user.tenantId;
      const resourceId = getResourceId(req);

      const resource: ResourceContext = {
        type: resourceType,
        id: resourceId,
        tenantId,
      };

      const decision = await rbac.evaluateAccess(user, resource, action);
      authReq.accessDecision = decision;

      if (!decision.allowed) {
        if (decision.stepUpRequired) {
          res.status(403).json({
            error: 'Step-up authentication required',
            code: 'STEP_UP_REQUIRED',
            reason: decision.reason,
          });
          return;
        }

        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
          reason: decision.reason,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Resource access middleware error', {
        error: error instanceof Error ? error.message : String(error),
        resourceType,
        action,
      });
      res.status(500).json({
        error: 'Authorization service error',
        code: 'AUTHZ_SERVICE_ERROR',
      });
    }
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let rbacInstance: MultiTenantRBACManager | null = null;

export function getMultiTenantRBAC(
  config?: Partial<RBACConfig>,
  opaClient?: OPAClient
): MultiTenantRBACManager {
  if (!rbacInstance) {
    rbacInstance = new MultiTenantRBACManager(config, opaClient);
  }
  return rbacInstance;
}

export function resetMultiTenantRBAC(): void {
  rbacInstance = null;
}
