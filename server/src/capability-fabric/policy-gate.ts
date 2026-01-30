import { opaPolicyEngine } from '../conductor/governance/opa-integration.js';
import { CapabilitySpec } from './types.js';

export async function evaluateCapabilityPolicy(
  capability: CapabilitySpec,
  context: {
    tenantId: string;
    userId?: string;
    role: string;
    sessionId?: string;
    scopes?: string[];
    approvalToken?: string;
  },
): Promise<{ allow: boolean; reason: string }> {
  if (!capability.policy_refs || capability.policy_refs.length === 0) {
    return { allow: false, reason: 'policy_missing' };
  }

  const policyName = capability.policy_refs[0]
    .replace('policies/', '')
    .replace('.rego', '')
    .replace(/\//g, '.');

  const decision = await opaPolicyEngine.evaluatePolicy(policyName, {
    tenantId: context.tenantId,
    userId: context.userId,
    role: context.role,
    action: 'capability.invoke',
    resource: capability.capability_id,
    subjectAttributes: {
      scopes: context.scopes ?? [],
      approvalToken: !!context.approvalToken,
    },
  });

  return { allow: decision.allow, reason: decision.reason };
}
