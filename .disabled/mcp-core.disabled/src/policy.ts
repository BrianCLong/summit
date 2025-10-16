import type { TenantContext } from './auth.js';
import type { PolicyEvaluator } from './registry.js';

export async function enforcePolicy(
  policy: PolicyEvaluator | undefined,
  tenant: TenantContext,
  payload?: unknown,
): Promise<void> {
  if (!policy) {
    return;
  }

  const allowed = await policy(tenant, payload);
  if (!allowed) {
    throw new Error('Policy denied');
  }
}
