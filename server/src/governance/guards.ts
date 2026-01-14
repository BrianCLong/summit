import { TenantContext } from '../middleware/tenantContext.js';
import { GovernanceVerdict, PolicyAction } from './types.js';
import { tenantKillSwitch } from '../tenancy/killSwitch.js';

export interface KillSwitchGuardOptions {
  action: string;
}

/**
 * Checks if the kill switch is active for the given tenant and action.
 * Returns a GovernanceVerdict indicating ALLOW or DENY.
 */
export async function killSwitchGuard(
  ctx: TenantContext,
  options: KillSwitchGuardOptions,
): Promise<GovernanceVerdict> {
  const isEnabled = tenantKillSwitch.isDisabled(ctx.tenantId);

  // Default to ALLOW if kill switch is not active
  let action: PolicyAction = 'ALLOW';
  let reasons: string[] = [];
  const policyIds: string[] = [];

  if (isEnabled) {
    action = 'DENY';
    reasons.push(`Kill switch active for tenant ${ctx.tenantId}`);
    policyIds.push('tenant_kill_switch');
  }

  // TODO: Add more granular checks based on action if needed in the future

  return {
    action,
    reasons,
    policyIds,
    metadata: {
      timestamp: new Date().toISOString(),
      evaluator: 'killSwitchGuard',
      latencyMs: 0,
      simulation: false,
    },
    provenance: {
      origin: 'local_kill_switch',
      confidence: 1.0,
    },
  };
}
