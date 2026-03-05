import { createHash } from 'node:crypto';
import {
  PolicyAuditRecord,
  PolicyDecision,
  PolicyDecisionContext,
  PolicyDecisionInput,
  PolicyProfile,
  PolicyRule,
} from './types.js';

const IMMUTABLE_RULE_IDS = new Set(['ban_autonomous_targeting']);

export class PolicyEngine {
  private readonly profileMap: Map<PolicyProfile['name'], PolicyProfile>;
  private readonly audits: PolicyAuditRecord[] = [];

  constructor(profiles: PolicyProfile[]) {
    this.profileMap = new Map(profiles.map((profile) => [profile.name, profile]));
  }

  evaluate(input: PolicyDecisionInput): PolicyDecision {
    const profile = this.profileMap.get(input.profile);
    if (!profile) {
      return this.denyWithAudit(input, {
        reason: `Unknown policy profile: ${input.profile}`,
        matchedRules: [],
      });
    }

    const matchingRules = profile.rules.filter((rule) => this.matches(input, rule));
    const denyRule = matchingRules.find((rule) => rule.effect === 'deny');
    if (denyRule) {
      return this.denyWithAudit(input, {
        reason: denyRule.reason,
        matchedRules: matchingRules.map((rule) => rule.id),
      });
    }

    const allowRule = matchingRules.find((rule) => rule.effect === 'allow');
    if (!allowRule) {
      return this.denyWithAudit(input, {
        reason: 'Deny-by-default fallback: no allow rule matched.',
        matchedRules: matchingRules.map((rule) => rule.id),
      });
    }

    const decision: PolicyDecision = {
      allowed: true,
      reason: allowRule.reason,
      matchedRules: matchingRules.map((rule) => rule.id),
      profile: profile.name,
      context: input.context,
    };
    this.emitAudit(decision);
    return decision;
  }

  listAudits(): PolicyAuditRecord[] {
    return [...this.audits];
  }

  updateProfile(name: PolicyProfile['name'], updater: (profile: PolicyProfile) => PolicyProfile): PolicyProfile {
    const existing = this.profileMap.get(name);
    if (!existing) {
      throw new Error(`Policy profile ${name} does not exist.`);
    }

    const updated = updater(existing);
    const immutableBefore = existing.rules.filter((rule) => IMMUTABLE_RULE_IDS.has(rule.id));
    for (const immutableRule of immutableBefore) {
      const current = updated.rules.find((rule) => rule.id === immutableRule.id);
      if (!current || current.effect !== immutableRule.effect || current.intent !== immutableRule.intent) {
        throw new Error(`Immutable red line cannot be removed or changed: ${immutableRule.id}`);
      }
    }

    this.profileMap.set(name, updated);
    return updated;
  }

  private matches(input: PolicyDecisionInput, rule: PolicyRule): boolean {
    return (
      (rule.intent === '*' || rule.intent === input.intent) &&
      (rule.actorType === '*' || rule.actorType === input.actorType) &&
      (rule.modelTier === '*' || rule.modelTier === input.modelTier)
    );
  }

  private denyWithAudit(input: PolicyDecisionInput, details: { reason: string; matchedRules: string[] }): PolicyDecision {
    const decision: PolicyDecision = {
      allowed: false,
      reason: details.reason,
      matchedRules: details.matchedRules,
      profile: input.profile,
      context: input.context,
    };
    this.emitAudit(decision);
    return decision;
  }

  private emitAudit(decision: PolicyDecision): void {
    const decisionBody = JSON.stringify(decision);
    this.audits.push({
      id: `audit-${this.audits.length + 1}`,
      at: new Date().toISOString(),
      decision,
      digest: createHash('sha256').update(decisionBody).digest('hex'),
    });
  }
}

export const defaultPolicyProfiles: PolicyProfile[] = [
  {
    name: 'civilian_safe',
    description: 'Default enterprise safety posture with immutable red lines.',
    rules: [
      {
        id: 'ban_autonomous_targeting',
        effect: 'deny',
        intent: 'autonomous_targeting',
        actorType: '*',
        modelTier: '*',
        reason: 'Immutable red line: autonomous military targeting is prohibited.',
      },
      {
        id: 'allow_business_analytics',
        effect: 'allow',
        intent: 'business_analytics',
        actorType: '*',
        modelTier: '*',
        reason: 'Business analytics is allowed under policy.',
      },
    ],
  },
  {
    name: 'defense_restricted',
    description: 'Defense posture with strict bounds and immutable red lines.',
    rules: [
      {
        id: 'ban_autonomous_targeting',
        effect: 'deny',
        intent: 'autonomous_targeting',
        actorType: '*',
        modelTier: '*',
        reason: 'Immutable red line: autonomous military targeting is prohibited.',
      },
      {
        id: 'allow_decision_support_for_human_operator',
        effect: 'allow',
        intent: 'decision_support',
        actorType: 'gov_operator',
        modelTier: '*',
        reason: 'Decision support is allowed only for human operators.',
      },
    ],
  },
  {
    name: 'research_unrestricted',
    description: 'Research posture while preserving immutable vendor red lines.',
    rules: [
      {
        id: 'ban_autonomous_targeting',
        effect: 'deny',
        intent: 'autonomous_targeting',
        actorType: '*',
        modelTier: '*',
        reason: 'Immutable red line: autonomous military targeting is prohibited.',
      },
      {
        id: 'allow_research_experiments',
        effect: 'allow',
        intent: '*',
        actorType: 'researcher',
        modelTier: '*',
        reason: 'Research experiments are allowed for designated researchers.',
      },
    ],
  },
];

export function createDefaultPolicyContext(requestId: string, tenantId: string): PolicyDecisionContext {
  return {
    requestId,
    tenantId,
    issuedAt: new Date().toISOString(),
  };
}
