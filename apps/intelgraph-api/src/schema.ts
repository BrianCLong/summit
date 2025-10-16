import { gql } from 'apollo-server-express';
import base from '../schema/base.graphql?raw';

export const typeDefs = gql`
  ${base}
`;

// Simple in-memory cache
const cache = new Map<string, any>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Helper function for authorization
const authorize = (
  user: any,
  requiredRoles: string[] = [],
  requiredTenantId: string | null = null,
) => {
  if (!user.isAuthenticated) {
    throw new Error('Authentication required');
  }
  if (
    requiredRoles.length > 0 &&
    !requiredRoles.some((role) => user.roles.includes(role))
  ) {
    throw new Error('Authorization failed: Insufficient roles');
  }
  if (requiredTenantId && user.tenantId !== requiredTenantId) {
    throw new Error('Authorization failed: Tenant mismatch');
  }
};

export const resolvers = {
  Query: {
    org: async (_: any, { id }: any, ctx: any) => {
      authorize(ctx.user, ['admin', 'viewer']); // Example: only admins and viewers can see orgs

      const cacheKey = `org:${id}`;
      const cachedResult = cache.get(cacheKey);
      if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
        ctx.logger.info(`Cache hit for ${cacheKey}`);
        return cachedResult.data;
      }

      ctx.logger.info(`Cache miss for ${cacheKey}, fetching from DB`);
      const result = await ctx.pg.oneOrNone(
        'select id, name, region, created_at as "createdAt" from org where id=$1',
        [id],
      );
      if (result) {
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
      return result;
    },
    tenant: async (_: any, { id }: any, ctx: any) => {
      authorize(ctx.user, ['admin', 'viewer'], id); // Example: only admins/viewers of that tenant can see it
      return ctx.pg.oneOrNone(
        'select id, org_id as "orgId", name, created_at as "createdAt" from tenant where id=$1',
        [id],
      );
    },
    user: async (_: any, { id }: any, ctx: any) => {
      authorize(ctx.user, ['admin', 'viewer']); // Example: only admins/viewers can see users
      // Ensure user can only see users within their tenant, unless they are a platform admin
      const query = ctx.user.roles.includes('platform_admin')
        ? 'select id, tenant_id as "tenantId", email, roles, created_at as "createdAt" from app_user where id=$1'
        : 'select id, tenant_id as "tenantId", email, roles, created_at as "createdAt" from app_user where id=$1 and tenant_id=$2';
      const params = ctx.user.roles.includes('platform_admin')
        ? [id]
        : [id, ctx.user.tenantId];
      return ctx.pg.oneOrNone(query, params);
    },
    roles: async (_: any, __: any, ctx: any) => {
      authorize(ctx.user, ['admin']);
      return ctx.pg.any('select id, name, created_at as "createdAt" from role');
    },
    permissions: async (_: any, __: any, ctx: any) => {
      authorize(ctx.user, ['admin']);
      return ctx.pg.any(
        'select id, name, description, created_at as "createdAt" from permission',
      );
    },
  },
  Mutation: {
    upsertPolicy: async (
      _: any,
      { tenantId, name, version, body }: any,
      ctx: any,
    ) => {
      authorize(ctx.user, ['admin'], tenantId); // Only admins of that tenant can upsert policies
      const row = await ctx.pg.one(
        'insert into policy(tenant_id, name, version, body) values($1,$2,$3,$4) returning id, tenant_id as "tenantId", name, version, body, now() as "createdAt"',
        [tenantId, name, version, body],
      );
      return row;
    },
    recordArtifact: async (
      _: any,
      {
        tenantId,
        planId,
        kind,
        uri,
        hash,
        signature,
        userId,
        serviceAccountId,
        artifactHash,
      }: any,
      ctx: any,
    ) => {
      authorize(ctx.user, ['admin', 'contributor'], tenantId); // Only admins/contributors of that tenant can record artifacts
      const row = await ctx.pg.one(
        'insert into artifact(tenant_id, plan_id, kind, uri, hash, signature, user_id, service_account_id, artifact_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, tenant_id as "tenantId", plan_id as "planId", kind, uri, hash, signature, user_id as "userId", service_account_id as "serviceAccountId", artifact_hash as "artifactHash", now() as "createdAt" ',
        [
          tenantId,
          planId,
          kind,
          uri,
          hash,
          signature,
          userId,
          serviceAccountId,
          artifactHash,
        ],
      );
      return row;
    },
    assignRoleToUser: async (_: any, { userId, roleId }: any, ctx: any) => {
      authorize(ctx.user, ['admin']); // Only admins can assign roles
      // Logic to assign role to user, ensuring tenant scope if not platform_admin
      const user = await ctx.pg.oneOrNone(
        'select tenant_id from app_user where id=$1',
        [userId],
      );
      if (!user) throw new Error('User not found');
      authorize(ctx.user, ['admin'], user.tenant_id); // Admin must be in the same tenant as the user
      await ctx.pg.one(
        'insert into user_roles(user_id, role_id) values($1,$2) on conflict (user_id, role_id) do nothing',
        [userId, roleId],
      );
      return ctx.pg.oneOrNone(
        'select id, tenant_id as "tenantId", email, roles, created_at as "createdAt" from app_user where id=$1',
        [userId],
      );
    },
    createRole: async (_: any, { name, permissionIds }: any, ctx: any) => {
      authorize(ctx.user, ['admin']); // Only admins can create roles
      const role = await ctx.pg.one(
        'insert into role(name) values($1) returning id, name, now() as "createdAt" ',
        [name],
      );
      if (permissionIds && permissionIds.length > 0) {
        // Insert role permissions
        const values = permissionIds
          .map((pid: string) => `('${role.id}', '${pid}')`)
          .join(',');
        await ctx.pg.any(
          `insert into role_permissions(role_id, permission_id) values ${values} on conflict do nothing`,
        );
      }
      return role;
    },
    createPermission: async (_: any, { name, description }: any, ctx: any) => {
      authorize(ctx.user, ['admin']); // Only admins can create permissions
      const permission = await ctx.pg.one(
        'insert into permission(name, description) values($1,$2) returning id, name, description, now() as "createdAt" ',
        [name, description],
      );
      return permission;
    },
  },
};
