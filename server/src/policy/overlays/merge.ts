import { MergedPolicy, OverlayPatch, PolicyRule, TenantOverlayConfig } from './types.js';

const cloneRule = (rule: PolicyRule): PolicyRule => ({
  ...rule,
  metadata: rule.metadata ? { ...rule.metadata } : undefined,
  condition: rule.condition ? { ...rule.condition } : undefined,
});

const applyPatch = (
  rules: PolicyRule[],
  patch: OverlayPatch,
  appendOrder: PolicyRule[],
): PolicyRule[] => {
  const nextRules = [...rules];
  const index = nextRules.findIndex((rule) => rule.id === patch.ruleId);

  switch (patch.op) {
    case 'remove':
      if (index !== -1) {
        nextRules.splice(index, 1);
      }
      return nextRules;
    case 'override': {
      if (!patch.rule) {
        throw new Error(`Override patch for rule ${patch.ruleId} is missing replacement rule`);
      }

      if (index !== -1) {
        nextRules[index] = cloneRule(patch.rule);
      } else {
        // If the rule does not exist, fall back to append semantics deterministically
        nextRules.push(cloneRule(patch.rule));
        appendOrder.push(cloneRule(patch.rule));
      }
      return nextRules;
    }
    case 'append': {
      if (!patch.rule) {
        throw new Error(`Append patch for rule ${patch.ruleId} is missing rule payload`);
      }
      if (index === -1 && !nextRules.some((rule) => rule.id === patch.rule!.id)) {
        const newRule = cloneRule(patch.rule);
        nextRules.push(newRule);
        appendOrder.push(newRule);
      }
      return nextRules;
    }
    default:
      return nextRules;
  }
};

export const mergePolicyOverlay = (
  basePolicy: { rules: PolicyRule[] },
  overlay: TenantOverlayConfig,
): MergedPolicy => {
  const stableBaseRules = basePolicy.rules.map(cloneRule);
  const appendOrder: PolicyRule[] = [];

  const patchedRules = overlay.patches.reduce<PolicyRule[]>((rules, patch) => {
    return applyPatch(rules, patch, appendOrder);
  }, stableBaseRules);

  // Ensure deterministic ordering: base order preserved, appended rules follow insertion order
  const stableRuleSet = patchedRules.filter((rule, idx, arr) => arr.findIndex((r: any) => r.id === rule.id) === idx);

  return {
    base: overlay.base,
    tenantId: overlay.tenantId,
    rules: stableRuleSet,
    appliedPatches: overlay.patches,
  };
};

export default mergePolicyOverlay;
