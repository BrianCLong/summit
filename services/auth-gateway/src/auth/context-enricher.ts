/**
 * Auth Context Enricher
 *
 * Enriches authenticated identities with additional ABAC attributes:
 * - Tenant information
 * - Data sensitivity levels
 * - Geo-location and data residency
 * - Custom attributes for policy evaluation
 */

import type { HumanIdentity } from './oidc-authenticator.js';
import type { ServiceIdentity } from './service-authenticator.js';

export interface EnricherConfig {
  tenantServiceUrl: string;
}

export interface AuthContext {
  identity: HumanIdentity | ServiceIdentity;
  tenant: TenantContext | null;
  permissions: Permission[];
  attributes: ABACAttributes;
}

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  tier: 'free' | 'pro' | 'enterprise' | 'government';
  status: 'active' | 'suspended' | 'trial';
  dataResidency: string[];  // Allowed regions: ['us', 'eu', 'apac']
  exportControlTier: 'unrestricted' | 'restricted' | 'embargoed';
  maxSensitivityLevel: number;  // 0=public, 1=internal, 2=confidential, 3=secret
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface ABACAttributes {
  tenantId: string | null;
  userId: string;
  roles: string[];
  groups: string[];
  dataResidency: string[];
  exportControlTier: string;
  maxSensitivityLevel: number;
  isHuman: boolean;
  isService: boolean;
  namespace?: string;
  customAttributes: Record<string, any>;
}

export class AuthContextEnricher {
  private config: EnricherConfig;

  constructor(config: EnricherConfig) {
    this.config = config;
  }

  /**
   * Enrich human identity with ABAC attributes
   */
  async enrichHumanIdentity(identity: HumanIdentity): Promise<AuthContext> {
    // Determine tenant from user attributes or default tenant
    const tenantId = identity.attributes.tenantId || identity.attributes.tenant_id || null;

    let tenant: TenantContext | null = null;
    if (tenantId) {
      tenant = await this.fetchTenantContext(tenantId);
    }

    // Map roles to permissions
    const permissions = this.mapRolesToPermissions(identity.roles);

    // Build ABAC attributes
    const attributes: ABACAttributes = {
      tenantId,
      userId: identity.userId,
      roles: identity.roles,
      groups: identity.groups,
      dataResidency: tenant?.dataResidency || ['us'],
      exportControlTier: tenant?.exportControlTier || 'unrestricted',
      maxSensitivityLevel: tenant?.maxSensitivityLevel || 1,
      isHuman: true,
      isService: false,
      customAttributes: {
        email: identity.email,
        name: identity.name,
        emailVerified: identity.attributes.emailVerified
      }
    };

    return {
      identity,
      tenant,
      permissions,
      attributes
    };
  }

  /**
   * Enrich service identity with ABAC attributes
   */
  async enrichServiceIdentity(identity: ServiceIdentity): Promise<AuthContext> {
    // Services may operate on behalf of multiple tenants
    // Tenant context will be determined per-request
    const permissions = this.mapServiceToPermissions(identity.serviceName);

    const attributes: ABACAttributes = {
      tenantId: null,  // Set per-request
      userId: identity.spiffeId,
      roles: [`service:${identity.serviceName}`],
      groups: [`namespace:${identity.namespace}`],
      dataResidency: ['*'],  // Services can access all regions
      exportControlTier: 'unrestricted',
      maxSensitivityLevel: 3,  // Services have highest sensitivity access
      isHuman: false,
      isService: true,
      namespace: identity.namespace,
      customAttributes: {
        spiffeId: identity.spiffeId,
        serviceName: identity.serviceName
      }
    };

    return {
      identity,
      tenant: null,
      permissions,
      attributes
    };
  }

  /**
   * Fetch tenant context from tenant registry
   */
  private async fetchTenantContext(tenantId: string): Promise<TenantContext | null> {
    try {
      const response = await fetch(`${this.config.tenantServiceUrl}/tenants/${tenantId}`);

      if (!response.ok) {
        console.warn(`Failed to fetch tenant ${tenantId}: ${response.status}`);
        return null;
      }

      const tenant = await response.json();

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tier: tenant.tier || 'free',
        status: tenant.status || 'active',
        dataResidency: tenant.dataResidency || ['us'],
        exportControlTier: tenant.exportControlTier || 'unrestricted',
        maxSensitivityLevel: tenant.maxSensitivityLevel || 1
      };
    } catch (error) {
      console.error(`Error fetching tenant ${tenantId}`, error);
      return null;
    }
  }

  /**
   * Map user roles to permissions
   */
  private mapRolesToPermissions(roles: string[]): Permission[] {
    const permissions: Permission[] = [];

    for (const role of roles) {
      switch (role) {
        case 'MeshOperator':
        case 'mesh-operator':
          permissions.push(
            { resource: 'mesh:*', actions: ['read', 'create', 'update'] },
            { resource: 'mesh:orchestrator:*', actions: ['read', 'execute'] },
            { resource: 'mesh:policy:*', actions: ['read'] }
          );
          break;

        case 'SecurityOfficer':
        case 'security-officer':
          permissions.push(
            { resource: 'mesh:*', actions: ['read'] },
            { resource: 'mesh:policy:*', actions: ['read', 'create', 'update', 'delete'] },
            { resource: 'mesh:audit:*', actions: ['read'] }
          );
          break;

        case 'AuditReader':
        case 'audit-reader':
          permissions.push(
            { resource: 'mesh:audit:*', actions: ['read'] },
            { resource: 'mesh:provenance:*', actions: ['read'] }
          );
          break;

        case 'TenantAdmin':
        case 'tenant-admin':
          permissions.push(
            { resource: 'mesh:tenant:*', actions: ['read', 'update'] },
            { resource: 'mesh:agent:*', actions: ['read', 'create', 'update', 'delete'] },
            { resource: 'mesh:task:*', actions: ['read', 'create'] }
          );
          break;

        case 'TenantUser':
        case 'tenant-user':
          permissions.push(
            { resource: 'mesh:task:*', actions: ['read', 'create'] },
            { resource: 'mesh:agent:*', actions: ['read'] }
          );
          break;

        default:
          // Unknown role - no permissions
          break;
      }
    }

    return permissions;
  }

  /**
   * Map service name to permissions
   */
  private mapServiceToPermissions(serviceName: string): Permission[] {
    const permissions: Permission[] = [];

    switch (serviceName) {
      case 'mesh-orchestrator':
        permissions.push(
          { resource: 'mesh:*', actions: ['read', 'create', 'update'] },
          { resource: 'mesh:agent:*', actions: ['execute'] },
          { resource: 'mesh:storage:*', actions: ['read', 'write'] }
        );
        break;

      case 'routing-gateway':
        permissions.push(
          { resource: 'mesh:model:*', actions: ['invoke'] },
          { resource: 'mesh:storage:cache', actions: ['read', 'write'] }
        );
        break;

      case 'policy-enforcer':
        permissions.push(
          { resource: 'mesh:policy:*', actions: ['read', 'evaluate'] },
          { resource: 'mesh:audit:*', actions: ['write'] }
        );
        break;

      case 'agent-runtime':
        permissions.push(
          { resource: 'mesh:tool:*', actions: ['execute'] },
          { resource: 'mesh:storage:*', actions: ['read', 'write'] }
        );
        break;

      default:
        // Default service permissions (minimal)
        permissions.push(
          { resource: 'mesh:health', actions: ['read'] }
        );
        break;
    }

    return permissions;
  }
}
