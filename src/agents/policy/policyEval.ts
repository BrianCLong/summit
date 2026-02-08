import type { PolicyBundle, PolicyDecision, ToolInvocation } from './policyTypes';

export function evaluateInvocation(
  inv: ToolInvocation,
  policy: PolicyBundle,
): PolicyDecision {
  const tool = policy.tools[inv.toolId];
  if (!tool || !tool.enabled) {
    return { allow: false, reason: 'TOOL_NOT_ALLOWLISTED' };
  }

  const op = (inv.operation || '').toLowerCase();
  for (const pattern of policy.bannedPatterns) {
    if (op.includes(pattern.toLowerCase())) {
      return { allow: false, reason: 'BANNED_OPERATION' };
    }
  }

  if (inv.scopes && inv.scopes.length > 0) {
    const missingScope = inv.scopes.find(
      (scope) => !tool.scopes.includes(scope),
    );
    if (missingScope) {
      return { allow: false, reason: 'SCOPE_NOT_ALLOWLISTED' };
    }
  }

  if (inv.sourceId) {
    const source = policy.sources[inv.sourceId];
    if (!source || !source.enabled) {
      return { allow: false, reason: 'SOURCE_NOT_ALLOWLISTED' };
    }
    if (!source.lawful_basis) {
      return { allow: false, reason: 'LAWFUL_BASIS_REQUIRED' };
    }
    if (
      source.classification === 'RESTRICTED' ||
      source.requires_approval === true
    ) {
      if (!inv.approvalId) {
        return { allow: false, reason: 'APPROVAL_REQUIRED' };
      }
    }
  }

  return { allow: true };
}
