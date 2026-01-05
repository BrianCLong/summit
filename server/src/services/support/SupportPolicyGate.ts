import { randomUUID } from 'crypto';
import AuthService from '../AuthService.js';
import { PolicyEngine } from '../PolicyEngine.js';
import { AppError } from '../../lib/errors.js';
import logger from '../../utils/logger.js';
import { SupportPolicyRule, isRoleAllowed } from '../../policies/support.js';

export interface SupportActor {
  id: string;
  role: string;
  tenantId: string;
  email?: string;
}

export interface SupportPolicyDecision {
  allow: boolean;
  reason: string;
  policyId: string;
  policyDecisionId: string;
}

export async function enforceSupportPolicy(params: {
  actor: SupportActor;
  policy: SupportPolicyRule;
  action: string;
  resource: Record<string, unknown> & { id?: string; type: string };
  justification?: string;
}): Promise<SupportPolicyDecision> {
  const { actor, policy, action, resource, justification } = params;
  const decisionId = randomUUID();
  const authService = new AuthService();
  const policyEngine = PolicyEngine.getInstance();

  if (policy.requireJustification && !justification?.trim()) {
    throw new AppError('Justification is required for this action.', 400, 'JUSTIFICATION_REQUIRED');
  }

  const roleAllowed = isRoleAllowed(actor.role, policy.allowedRoles);
  const permissionMatches = policy.requiredPermissions.filter((permission) =>
    authService.hasPermission(actor as any, permission),
  );
  const permissionAllowed =
    policy.requiredPermissions.length === 0 || permissionMatches.length > 0;

  const engineDecision = await policyEngine.evaluate({
    environment: process.env.NODE_ENV || 'dev',
    user: {
      id: actor.id,
      role: actor.role,
      permissions: permissionMatches,
      tenantId: actor.tenantId,
    },
    action,
    resource,
  });

  const allow = roleAllowed && permissionAllowed && engineDecision.allow;
  const reason = !roleAllowed
    ? 'Role not allowlisted'
    : !permissionAllowed
      ? 'Permission not allowlisted'
      : engineDecision.allow
        ? 'Allowed by policy'
        : engineDecision.reason || 'Policy engine denied';

  logger.info('Support policy evaluated', {
    actorId: actor.id,
    policyId: policy.id,
    policyDecisionId: decisionId,
    action,
    resourceType: resource.type,
    allow,
    reason,
  });

  if (!allow) {
    throw new AppError(`Policy denied: ${reason}`, 403, 'POLICY_DENIED');
  }

  return {
    allow,
    reason,
    policyId: policy.id,
    policyDecisionId: decisionId,
  };
}
