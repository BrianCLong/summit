/**
 * CompanyOS Tenant API - GraphQL Resolvers
 */

import { tenantService, auditService } from '../services/index.js';
import { healthCheck as dbHealthCheck } from '../db/postgres.js';
import type { GraphQLContext } from './context.js';
import type {
  CreateTenantInput,
  UpdateTenantInput,
  SetFeatureFlagInput,
  Tenant,
} from '../types/index.js';
import { GraphQLScalarType, Kind } from 'graphql';

// Custom DateTime scalar
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw new Error('DateTime cannot represent non-Date value');
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    throw new Error('DateTime cannot parse non-string/number value');
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      return new Date(ast.kind === Kind.INT ? ast.value : ast.value);
    }
    return null;
  },
});

// Custom JSON scalar
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch {
        return ast.value;
      }
    }
    if (ast.kind === Kind.INT) {
      return parseInt(ast.value, 10);
    }
    if (ast.kind === Kind.FLOAT) {
      return parseFloat(ast.value);
    }
    if (ast.kind === Kind.BOOLEAN) {
      return ast.value;
    }
    if (ast.kind === Kind.NULL) {
      return null;
    }
    if (ast.kind === Kind.OBJECT) {
      const obj: Record<string, unknown> = {};
      for (const field of ast.fields) {
        obj[field.name.value] = JSONScalar.parseLiteral(field.value);
      }
      return obj;
    }
    if (ast.kind === Kind.LIST) {
      return ast.values.map((v) => JSONScalar.parseLiteral(v));
    }
    return null;
  },
});

// Helper to get actor info from context
function getActor(context: GraphQLContext) {
  return {
    id: context.user?.id,
    email: context.user?.email,
    ip: context.clientIp,
  };
}

export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  Query: {
    // Tenant queries
    tenant: async (
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ) => {
      context.logger.info({ tenantId: id }, 'Fetching tenant by ID');
      return tenantService.getTenantById(id);
    },

    tenantBySlug: async (
      _parent: unknown,
      { slug }: { slug: string },
      context: GraphQLContext,
    ) => {
      context.logger.info({ slug }, 'Fetching tenant by slug');
      return tenantService.getTenantBySlug(slug);
    },

    tenants: async (
      _parent: unknown,
      {
        status,
        limit,
        offset,
      }: { status?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) => {
      context.logger.info({ status, limit, offset }, 'Listing tenants');
      const result = await tenantService.listTenants({ status, limit, offset });

      return {
        tenants: result.tenants,
        totalCount: result.totalCount,
        pageInfo: {
          hasNextPage: (offset || 0) + (limit || 50) < result.totalCount,
          hasPreviousPage: (offset || 0) > 0,
        },
      };
    },

    // Feature flag queries
    tenantFeatures: async (
      _parent: unknown,
      { tenantId }: { tenantId: string },
      context: GraphQLContext,
    ) => {
      context.logger.info({ tenantId }, 'Fetching tenant features');
      return tenantService.getTenantFeatures(tenantId);
    },

    effectiveFeatureFlags: async (
      _parent: unknown,
      { tenantId }: { tenantId: string },
      context: GraphQLContext,
    ) => {
      context.logger.info({ tenantId }, 'Getting effective feature flags');
      return tenantService.getEffectiveFeatureFlags(tenantId);
    },

    // Audit queries
    auditEvents: async (
      _parent: unknown,
      {
        filter,
        limit,
        offset,
      }: {
        filter?: {
          tenantId?: string;
          eventType?: string;
          action?: string;
          actorId?: string;
          startDate?: Date;
          endDate?: Date;
        };
        limit?: number;
        offset?: number;
      },
      context: GraphQLContext,
    ) => {
      context.logger.info({ filter, limit, offset }, 'Querying audit events');
      const result = await auditService.getAuditEvents({
        ...filter,
        limit,
        offset,
      });

      return {
        events: result.events,
        totalCount: result.totalCount,
        pageInfo: {
          hasNextPage: (offset || 0) + (limit || 100) < result.totalCount,
          hasPreviousPage: (offset || 0) > 0,
        },
      };
    },

    // Health check
    _health: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const dbHealthy = await dbHealthCheck();

      return {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        version: process.env.npm_package_version || '0.1.0',
        services: {
          postgres: dbHealthy ? 'healthy' : 'unhealthy',
        },
      };
    },
  },

  Mutation: {
    // Tenant mutations
    createTenant: async (
      _parent: unknown,
      { input }: { input: CreateTenantInput },
      context: GraphQLContext,
    ) => {
      context.logger.info({ input }, 'Creating tenant');

      const tenant = await tenantService.createTenant(input, context.user?.id);

      // Log audit event
      await auditService.logTenantCreated(
        tenant.id,
        { name: tenant.name, slug: tenant.slug, dataRegion: tenant.dataRegion },
        getActor(context),
      );

      context.logger.info(
        { tenantId: tenant.id, slug: tenant.slug },
        'Tenant created successfully',
      );

      return tenant;
    },

    updateTenant: async (
      _parent: unknown,
      { id, input }: { id: string; input: UpdateTenantInput },
      context: GraphQLContext,
    ) => {
      context.logger.info({ tenantId: id, input }, 'Updating tenant');

      const before = await tenantService.getTenantById(id);
      if (!before) {
        throw new Error(`Tenant not found: ${id}`);
      }

      const tenant = await tenantService.updateTenant(id, input, context.user?.id);
      if (!tenant) {
        throw new Error(`Failed to update tenant: ${id}`);
      }

      // Log audit event
      await auditService.logTenantUpdated(
        id,
        { name: before.name, status: before.status },
        { name: tenant.name, status: tenant.status },
        getActor(context),
      );

      context.logger.info({ tenantId: id }, 'Tenant updated successfully');

      return tenant;
    },

    deleteTenant: async (
      _parent: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ) => {
      context.logger.info({ tenantId: id }, 'Deleting tenant');

      const success = await tenantService.deleteTenant(id, context.user?.id);

      if (success) {
        await auditService.logTenantDeleted(id, getActor(context));
        context.logger.info({ tenantId: id }, 'Tenant deleted successfully');
      }

      return success;
    },

    // Feature flag mutations
    setFeatureFlag: async (
      _parent: unknown,
      { input }: { input: SetFeatureFlagInput },
      context: GraphQLContext,
    ) => {
      context.logger.info({ input }, 'Setting feature flag');

      const feature = await tenantService.setFeatureFlag(input, context.user?.id);

      await auditService.logFeatureFlagChanged(
        input.tenantId,
        input.flagName,
        input.enabled,
        getActor(context),
      );

      context.logger.info(
        {
          tenantId: input.tenantId,
          flagName: input.flagName,
          enabled: input.enabled,
        },
        'Feature flag updated',
      );

      return feature;
    },

    enableFeatureFlag: async (
      _parent: unknown,
      { tenantId, flagName }: { tenantId: string; flagName: string },
      context: GraphQLContext,
    ) => {
      return resolvers.Mutation.setFeatureFlag(
        _parent,
        { input: { tenantId, flagName, enabled: true } },
        context,
      );
    },

    disableFeatureFlag: async (
      _parent: unknown,
      { tenantId, flagName }: { tenantId: string; flagName: string },
      context: GraphQLContext,
    ) => {
      return resolvers.Mutation.setFeatureFlag(
        _parent,
        { input: { tenantId, flagName, enabled: false } },
        context,
      );
    },
  },

  // Type resolvers
  Tenant: {
    features: async (parent: Tenant, _args: unknown, context: GraphQLContext) => {
      return tenantService.getTenantFeatures(parent.id);
    },

    effectiveFlags: async (
      parent: Tenant,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      return tenantService.getEffectiveFeatureFlags(parent.id);
    },
  },
};
