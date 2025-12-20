import { GraphQLError } from 'graphql';
import { trace, Span } from '@opentelemetry/api';
import { pg } from '../db/pg';
import baseLogger from '../config/logger';

const tracer = trace.getTracer('tenant-context', '24.3.0');
const logger = baseLogger.child({ name: 'tenantContext' });

export interface TenantResidency {
  region: string;
  class: 'standard' | 'restricted' | 'sovereign';
  dataClassification: string[];
  allowedRegions: string[];
  exportRestrictions?: {
    requiresApproval: boolean;
    allowedDestinations: string[];
    retentionDays: number;
  };
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  regionTag: string;
  residency: TenantResidency;
  isActive: boolean;
  features: string[];
  quotas: {
    apiCallsPerHour: number;
    storageGB: number;
    exportCallsPerDay: number;
  };
}

export interface TenantValidationOptions {
  requireExplicitTenant?: boolean;
  allowSystemAccess?: boolean;
  validateOwnership?: boolean;
  cacheScope?: 'tenant' | 'global' | 'user';
  allowCrossRegion?: boolean;
  requireResidencyCompliance?: boolean;
}

interface TenantRecord {
  tenant_id: string;
  region_tag: string;
  residency_region: string;
  residency_class: 'standard' | 'restricted' | 'sovereign';
  residency_data_classification: string[];
  residency_allowed_regions: string[];
  export_requires_approval: boolean;
  export_allowed_destinations: string[];
  export_retention_days: number;
  is_active: boolean;
  features: string[];
  quota_api_calls_per_hour: number;
  quota_storage_gb: number;
  quota_export_calls_per_day: number;
  created_at: Date;
  updated_at: Date;
}

class TenantContextService {
  private tenantCache: Map<string, { data: TenantContext; expiresAt: number }> =
    new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  async resolveTenantContext(
    tenantId: string,
    currentRegion: string = process.env.CURRENT_REGION || 'us-east-1',
  ): Promise<TenantContext> {
    return tracer.startActiveSpan(
      'tenant_context.resolve',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: tenantId,
          current_region: currentRegion,
        });

        try {
          // Check cache first
          const cached = this.tenantCache.get(tenantId);
          if (cached && Date.now() < cached.expiresAt) {
            span.setAttributes({ cache_hit: true });
            return cached.data;
          }

          // Query tenant information from database
          const tenantRecord = (await pg.oneOrNone(
            `SELECT
             tenant_id,
             region_tag,
             residency_region,
             residency_class,
             residency_data_classification,
             residency_allowed_regions,
             export_requires_approval,
             export_allowed_destinations,
             export_retention_days,
             is_active,
             features,
             quota_api_calls_per_hour,
             quota_storage_gb,
             quota_export_calls_per_day,
             created_at,
             updated_at
           FROM tenants
           WHERE tenant_id = $1`,
            [tenantId],
            { tenantId },
          )) as TenantRecord | null;

          if (!tenantRecord) {
            span.setAttributes({ tenant_found: false });
            throw new GraphQLError('Tenant not found', {
              extensions: {
                code: 'TENANT_NOT_FOUND',
                tenantId,
              },
            });
          }

          if (!tenantRecord.is_active) {
            span.setAttributes({ tenant_active: false });
            throw new GraphQLError('Tenant is inactive', {
              extensions: {
                code: 'TENANT_INACTIVE',
                tenantId,
              },
            });
          }

          // Build tenant context
          const tenantContext: TenantContext = {
            tenantId: tenantRecord.tenant_id,
            userId: '', // Will be set by caller
            roles: [], // Will be set by caller
            permissions: [], // Will be calculated by caller
            regionTag: tenantRecord.region_tag || this.getDefaultRegion(),
            residency: {
              region:
                tenantRecord.residency_region ||
                tenantRecord.region_tag ||
                this.getDefaultRegion(),
              class: tenantRecord.residency_class || 'standard',
              dataClassification:
                tenantRecord.residency_data_classification || [],
              allowedRegions: tenantRecord.residency_allowed_regions || [
                tenantRecord.region_tag || this.getDefaultRegion(),
              ],
              exportRestrictions: {
                requiresApproval:
                  tenantRecord.export_requires_approval || false,
                allowedDestinations:
                  tenantRecord.export_allowed_destinations || [],
                retentionDays: tenantRecord.export_retention_days || 365,
              },
            },
            isActive: tenantRecord.is_active,
            features: tenantRecord.features || [],
            quotas: {
              apiCallsPerHour: tenantRecord.quota_api_calls_per_hour || 10000,
              storageGB: tenantRecord.quota_storage_gb || 100,
              exportCallsPerDay: tenantRecord.quota_export_calls_per_day || 10,
            },
          };

          // Cache the result
          this.tenantCache.set(tenantId, {
            data: tenantContext,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
          });

          span.setAttributes({
            tenant_found: true,
            tenant_active: true,
            region_tag: tenantContext.regionTag,
            residency_class: tenantContext.residency.class,
            cache_hit: false,
          });

          return tenantContext;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  validateRegionAccess(
    tenantContext: TenantContext,
    targetRegion: string,
    operation: 'read' | 'write' | 'export',
    hasExportToken: boolean = false,
  ): boolean {
    return tracer.startActiveSpan(
      'tenant_context.validate_region_access',
      (span: Span) => {
        span.setAttributes({
          tenant_id: tenantContext.tenantId,
          target_region: targetRegion,
          tenant_region: tenantContext.regionTag,
          operation: operation,
          has_export_token: hasExportToken,
          residency_class: tenantContext.residency.class,
        });

        try {
          // Same region - always allowed
          if (targetRegion === tenantContext.regionTag) {
            span.setAttributes({ access_granted: true, reason: 'same_region' });
            return true;
          }

          // Check if target region is in allowed regions for this tenant
          if (!tenantContext.residency.allowedRegions.includes(targetRegion)) {
            span.setAttributes({
              access_granted: false,
              reason: 'region_not_allowed',
            });
            return false;
          }

          // Write operations require same region unless export token
          if (operation === 'write' && !hasExportToken) {
            span.setAttributes({
              access_granted: false,
              reason: 'write_requires_same_region',
            });
            return false;
          }

          // Export operations require export token or approval
          if (operation === 'export') {
            if (
              tenantContext.residency.exportRestrictions?.requiresApproval &&
              !hasExportToken
            ) {
              span.setAttributes({
                access_granted: false,
                reason: 'export_requires_approval',
              });
              return false;
            }
          }

          // Sovereign tenants have strict restrictions
          if (tenantContext.residency.class === 'sovereign') {
            if (operation !== 'read' || !hasExportToken) {
              span.setAttributes({
                access_granted: false,
                reason: 'sovereign_restrictions',
              });
              return false;
            }
          }

          // Restricted tenants need export token for cross-region access
          if (
            tenantContext.residency.class === 'restricted' &&
            !hasExportToken
          ) {
            span.setAttributes({
              access_granted: false,
              reason: 'restricted_requires_token',
            });
            return false;
          }

          span.setAttributes({
            access_granted: true,
            reason: 'validation_passed',
          });
          return true;
        } finally {
          span.end();
        }
      },
    );
  }

  validateDataClassification(
    tenantContext: TenantContext,
    dataClassifications: string[],
    operation: 'read' | 'write' | 'export',
  ): boolean {
    if (!dataClassifications.length) {
      return true; // No classification restrictions
    }

    // Check if tenant's data classification allows access to requested data
    const tenantClassifications = tenantContext.residency.dataClassification;

    // If tenant has no specific classifications, default to standard access
    if (!tenantClassifications.length) {
      return (
        !dataClassifications.includes('restricted') &&
        !dataClassifications.includes('secret')
      );
    }

    // Check access based on classification levels
    for (const classification of dataClassifications) {
      if (!tenantClassifications.includes(classification)) {
        return false;
      }
    }

    return true;
  }

  private getDefaultRegion(): string {
    return process.env.DEFAULT_REGION || 'us-east-1';
  }

  // Enhanced tenant validator with region awareness
  static async validateTenantAccess(
    context: any,
    resourceTenantId?: string,
    options: TenantValidationOptions = {},
  ): Promise<TenantContext> {
    const service = new TenantContextService();
    const {
      requireExplicitTenant = true,
      allowSystemAccess = false,
      validateOwnership = true,
      allowCrossRegion = false,
      requireResidencyCompliance = true,
    } = options;

    // Extract user context from request
    const userTenantId = context.user?.tenantId;
    const userId = context.user?.id;
    const roles = context.user?.roles || [];
    const currentRegion =
      context.headers?.['x-ig-region'] ||
      process.env.CURRENT_REGION ||
      'us-east-1';
    const hasExportToken = !!context.headers?.['x-export-token'];

    // System-level access check
    if (
      allowSystemAccess &&
      (roles.includes('SYSTEM') || roles.includes('SUPER_ADMIN'))
    ) {
      logger.info(`System-level access granted for user ${userId}`);

      // Even system users need tenant context for region compliance
      const effectiveTenantId = resourceTenantId || userTenantId;
      if (effectiveTenantId) {
        const tenantContext = await service.resolveTenantContext(
          effectiveTenantId,
          currentRegion,
        );
        return {
          ...tenantContext,
          userId,
          roles,
          permissions: ['*'],
        };
      }
    }

    // Validate user has tenant context
    if (requireExplicitTenant && !userTenantId) {
      logger.error(
        `Tenant isolation violation: User ${userId} lacks tenant context`,
      );
      throw new GraphQLError('Tenant context required', {
        extensions: {
          code: 'TENANT_REQUIRED',
          userId,
        },
      });
    }

    const effectiveTenantId = resourceTenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new GraphQLError('Unable to determine tenant context', {
        extensions: {
          code: 'TENANT_CONTEXT_INVALID',
        },
      });
    }

    // Resolve tenant context with region information
    const tenantContext = await service.resolveTenantContext(
      effectiveTenantId,
      currentRegion,
    );

    // Cross-tenant access validation
    if (
      validateOwnership &&
      resourceTenantId &&
      resourceTenantId !== userTenantId
    ) {
      logger.error(
        `Cross-tenant access denied: User ${userId} (tenant: ${userTenantId}) attempted to access resource (tenant: ${resourceTenantId})`,
      );
      throw new GraphQLError('Cross-tenant access denied', {
        extensions: {
          code: 'CROSS_TENANT_ACCESS_DENIED',
          userTenant: userTenantId,
          resourceTenant: resourceTenantId,
        },
      });
    }

    // Region access validation
    if (requireResidencyCompliance && !allowCrossRegion) {
      const operation = context.operation?.type || 'read';
      const regionAccessValid = service.validateRegionAccess(
        tenantContext,
        currentRegion,
        operation,
        hasExportToken,
      );

      if (!regionAccessValid) {
        logger.error(
          `Region access denied: Tenant ${effectiveTenantId} attempted ${operation} in region ${currentRegion}`,
        );
        throw new GraphQLError('Region access denied', {
          extensions: {
            code: 'REGION_ACCESS_DENIED',
            tenantId: effectiveTenantId,
            currentRegion,
            tenantRegion: tenantContext.regionTag,
            operation,
          },
        });
      }
    }

    // Set user context
    tenantContext.userId = userId;
    tenantContext.roles = roles;
    tenantContext.permissions = service.calculatePermissions(roles);

    logger.debug(
      `Tenant access validated for user ${userId}, tenant ${effectiveTenantId}, region ${currentRegion}`,
    );

    return tenantContext;
  }

  private calculatePermissions(roles: string[]): string[] {
    const permissions: Set<string> = new Set();

    roles.forEach((role) => {
      switch (role.toUpperCase()) {
        case 'SUPER_ADMIN':
        case 'SYSTEM':
          permissions.add('*');
          break;
        case 'ADMIN':
          permissions.add('investigations:*');
          permissions.add('entities:*');
          permissions.add('relationships:*');
          permissions.add('users:read');
          permissions.add('export:create');
          break;
        case 'ANALYST':
          permissions.add('investigations:read');
          permissions.add('investigations:write');
          permissions.add('entities:read');
          permissions.add('entities:write');
          permissions.add('relationships:read');
          permissions.add('relationships:write');
          permissions.add('graphrag:query');
          break;
        case 'VIEWER':
          permissions.add('investigations:read');
          permissions.add('entities:read');
          permissions.add('relationships:read');
          break;
        case 'EXPORT_ADMIN':
          permissions.add('export:*');
          permissions.add('residency:manage');
          break;
        default:
          break;
      }
    });

    return Array.from(permissions);
  }
}

export const tenantContextService = new TenantContextService();
export { TenantContextService };
