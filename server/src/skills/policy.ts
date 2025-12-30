import type { SkillContext, SkillSpec } from './abi.js';

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  missingCapabilities?: string[];
  missingTags?: string[];
}

export function assertSkillAllowed(spec: SkillSpec, ctx: SkillContext): PolicyDecision {
  const allowedTools = new Set(ctx.policy.allowedTools || []);
  const missingCapabilities = (spec.requiredCapabilities || []).filter(
    (capability) => !allowedTools.has(capability),
  );
  const missingTags = (spec.policyTags || []).filter((tag) => !allowedTools.has(tag));

  if (missingCapabilities.length > 0 || missingTags.length > 0) {
    return {
      allowed: false,
      missingCapabilities,
      missingTags,
      reason: 'missing_policy_capabilities',
    };
  }

  return {
    allowed: true,
  };
}
