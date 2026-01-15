import { policyService, PolicyContext, PolicyDecision } from './PolicyService.js';

export async function evaluate(
  action: string,
  user: Record<string, unknown> | undefined,
  resource: Record<string, unknown> | undefined,
  env: Record<string, unknown> | undefined,
): Promise<PolicyDecision> {
  if (!user || !user.id) {
    return { allow: false, reason: 'Unauthenticated' };
  }

  const principal = {
    ...user,
    id: String(user.id),
    role:
      (user.role as string | undefined) ||
      (user.roles as string[] | undefined)?.[0] ||
      'USER',
    tenantId:
      (user.tenantId as string | undefined) ||
      (resource?.tenantId as string | undefined),
  };

  const ctx: PolicyContext = {
    principal,
    resource: resource || {},
    action,
    environment: {
      ...(env || {}),
    },
  };

  return policyService.evaluate(ctx);
}
