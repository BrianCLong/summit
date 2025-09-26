import { GraphQLError } from 'graphql';

function normalizeRoles(context: any): string[] {
  const rawRoles: string[] = [];
  if (Array.isArray(context?.roles)) {
    rawRoles.push(...context.roles);
  }
  if (Array.isArray(context?.user?.roles)) {
    rawRoles.push(...context.user.roles);
  }
  if (context?.user?.role) {
    rawRoles.push(context.user.role);
  }
  return Array.from(new Set(rawRoles.map((role) => role?.toString().toUpperCase())));
}

export function resolveTenantId(context: any, requestedTenantId?: string): string {
  const claimTenant =
    context?.tenantId ||
    context?.user?.tenantId ||
    context?.user?.tenant ||
    context?.user?.tenant_id ||
    context?.claims?.tenantId;

  if (!claimTenant) {
    throw new GraphQLError('Tenant claim missing', {
      extensions: {
        code: 'TENANT_REQUIRED',
        http: { status: 403 },
      },
    });
  }

  if (!requestedTenantId) {
    return claimTenant;
  }

  if (requestedTenantId === claimTenant) {
    return requestedTenantId;
  }

  const roles = normalizeRoles(context);
  const canBypass = roles.includes('SUPER_ADMIN') || roles.includes('SYSTEM');

  if (!canBypass) {
    throw new GraphQLError('Cross-tenant access denied', {
      extensions: {
        code: 'CROSS_TENANT_ACCESS_DENIED',
        http: { status: 403 },
        tenantId: claimTenant,
        requestedTenantId,
      },
    });
  }

  return requestedTenantId;
}
