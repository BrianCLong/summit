import { AuthorizationDecision } from './AuthorizationTypes.js';
import {
  Principal,
  TenantId,
  ResourceRef,
  Action,
  TenantMembership,
  Tenant,
  ApiKey,
} from '../types/identity.js';
import { getPostgresPool } from '../config/database.js';
import { Pool } from 'pg';
import logger from '../utils/logger.js';
import { MultiTenantRBACManager, getMultiTenantRBAC } from '../auth/multi-tenant-rbac.js';

// Interface definition (matching the prompt requirement)
export interface AuthorizationService {
  can(
    principal: Principal,
    action: Action,
    resource: ResourceRef
  ): Promise<boolean>;

  assertCan(
    principal: Principal,
    action: Action,
    resource: ResourceRef
  ): Promise<void>;
}

export class AuthorizationServiceImpl implements AuthorizationService {
  private rbac: MultiTenantRBACManager;
  private pool: Pool;

  constructor() {
    this.rbac = getMultiTenantRBAC();
    this.pool = getPostgresPool();
  }

  async can(
    principal: Principal,
    action: Action,
    resource: ResourceRef,
  ): Promise<boolean> {
    try {
      // 1. Tenant Isolation Check
      if (principal.tenantId !== resource.tenantId && principal.kind !== 'system') {
        // System principals *might* be allowed cross-tenant in very specific cases,
        // but generally tenantId must match.
         // Specifically check if the user has a global admin role that allows cross-tenant access.
         const isGlobalAdmin = principal.roles.includes('global-admin');
         if (!isGlobalAdmin) {
             logger.warn(
               `Access denied: Cross-tenant access attempted by ${principal.id} (${principal.tenantId}) on ${resource.tenantId}`,
             );
             return false;
         }
      }

      // 2. Map high-level Action/Resource to RBAC permission string
      // e.g. view + maestro.run -> maestro.run:read
      // e.g. execute + maestro.run -> maestro.run:execute
      const permission = this.mapToPermission(action, resource.type);

      // 3. Delegate to MultiTenantRBACManager
      // We need to construct a "MultiTenantUser" shaped object from our Principal
      // effectively bridging the two models.
      const multiTenantUser = {
          id: principal.id,
          email: principal.user?.email || '',
          name: principal.user?.username || '',
          tenantId: principal.tenantId,
          tenantIds: [principal.tenantId], // In a real scenario, we'd fetch all memberships
          primaryTenantId: principal.tenantId,
          roles: principal.roles.map(r => ({
              tenantId: principal.tenantId,
              role: r,
              permissions: [],
              scope: 'full',
              grantedBy: 'system',
              grantedAt: new Date(),
          })),
          globalRoles: principal.roles, // Assuming roles are flattened for now
          attributes: {},
          clearanceLevel: 'unclassified', // Default
          lastAuthenticated: new Date(),
          mfaVerified: true, // Assume true for now or pass from context
      };

      // If the underlying RBAC manager returns true, we are good.
      // Note: The RBAC manager expects permission strings like 'investigation:read'.
      // Our mapToPermission needs to align with RBAC permissions.

      const hasPermission = this.rbac.hasPermission(
          // @ts-ignore - mismatch in types is expected during bridging
          multiTenantUser,
          permission
      );

      if (!hasPermission) {
          return false;
      }

      // 4. ABAC / OPA checks (Delegated to RBACManager or called directly)
      // The RBACManager has evaluateAccess which does OPA.
      // Let's use evaluateAccess for a more complete check if needed, but for 'can'
      // simple permission check is often 90% of cases.
      // However, for high security, we should use evaluateAccess.

      const decision = await this.rbac.evaluateAccess(
           // @ts-ignore
          multiTenantUser,
          {
              type: resource.type,
              id: resource.id || '',
              tenantId: resource.tenantId,
              // attributes: resource.attributes
          },
          action
      );

      return decision.allowed;

    } catch (error) {
      logger.error('Authorization check failed', error);
      return false;
    }
  }

  async assertCan(
    principal: Principal,
    action: Action,
    resource: ResourceRef,
  ): Promise<void> {
    const allowed = await this.can(principal, action, resource);
    if (!allowed) {
      throw new Error(`Permission denied: Cannot ${action} ${resource.type}`);
    }
  }

  private mapToPermission(action: Action, resourceType: string): string {
      // Simple mapping strategy
      // view -> read
      // create -> create
      // update -> update
      // delete -> delete
      // execute -> execute

      let verb = 'read';
      switch(action) {
          case 'view': verb = 'read'; break;
          case 'create': verb = 'create'; break;
          case 'update': verb = 'update'; break;
          case 'delete': verb = 'delete'; break;
          case 'execute': verb = 'execute'; break;
          case 'administer': verb = 'manage'; break;
          case 'manage_settings': verb = 'manage'; break;
      }

      // Resource type mapping if necessary
      // e.g. 'maestro.run' -> 'pipeline' or keep as is?
      // The RBAC system uses: investigation, entity, relationship, report, etc.
      // Let's assume resourceType matches RBAC resource names or we map them.

      return `${resourceType}:${verb}`;
  }
}
