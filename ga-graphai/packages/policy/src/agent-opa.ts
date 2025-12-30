import type { PolicyEffect, PolicyObligation } from 'common-types';
import {
  AuthorityLicenseCompiler,
  type CompiledGuardBundle,
  type GuardAuditRecord,
  type OpaGuard,
  type PolicyBundleDocument,
} from './authority-compiler.js';

export type AgentRiskLevel = 'exploratory' | 'restricted' | 'production';

export interface AgentProfile {
  id: string;
  role: string;
  riskLevel: AgentRiskLevel | string;
  tags?: string[];
}

export interface AgentAccessRequest {
  agent: AgentProfile;
  toolId: string;
  graphNamespace?: string;
  graphSensitivity?: 'sandbox' | 'production' | string;
  model?: string;
  tags?: string[];
}

export interface AgentPolicyDecision {
  allowed: boolean;
  effect: PolicyEffect;
  guardId?: string;
  obligations: PolicyObligation[];
  reason?: string;
  audit: GuardAuditRecord[];
}

function normalizeTag(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value : `${prefix}${value}`;
}

function matches(selectorValues: string[], candidate: string | undefined): boolean {
  if (selectorValues.length === 0) return true;
  if (!candidate) return false;
  return selectorValues.includes(candidate);
}

function matchesAny(selectorValues: string[], candidates: string[]): boolean {
  if (selectorValues.length === 0) return true;
  return candidates.some((candidate) => selectorValues.includes(candidate));
}

function riskViolation(
  riskLevel: string,
  graphSensitivity?: AgentAccessRequest['graphSensitivity'],
): string | null {
  if (graphSensitivity === 'production' && !riskLevel.includes('production')) {
    return 'Production graph access requires production risk posture';
  }
  return null;
}

export class AgentPolicyOPA {
  private readonly guards: OpaGuard[];
  private readonly auditTrail: GuardAuditRecord[];

  private constructor(bundle: CompiledGuardBundle) {
    this.guards = bundle.guards;
    this.auditTrail = bundle.auditTrail;
  }

  static fromBundle(bundle: PolicyBundleDocument, options?: { auditSink?: (entry: GuardAuditRecord) => void }): AgentPolicyOPA {
    const compiler = new AuthorityLicenseCompiler({ auditSink: options?.auditSink });
    const compiled = compiler.compile(bundle);
    return new AgentPolicyOPA(compiled);
  }

  evaluate(request: AgentAccessRequest): AgentPolicyDecision {
    const { action, resource, authorities, licenses, riskLevel } = this.buildContext(request);

    const violation = riskViolation(riskLevel, request.graphSensitivity);
    if (violation) {
      return {
        allowed: false,
        effect: 'deny',
        obligations: [],
        reason: violation,
        audit: this.auditTrail,
      };
    }

    let matched: OpaGuard | undefined;
    for (const guard of this.guards) {
      if (!matchesAny(guard.selector.actions, [action])) continue;
      if (!matchesAny(guard.selector.resources, [resource])) continue;
      if (!matchesAny(guard.selector.authorities, authorities)) continue;
      if (!matchesAny(guard.selector.licenses, licenses)) continue;
      matched = guard;
      if (guard.effect === 'deny') {
        break;
      }
    }

    if (!matched) {
      return { allowed: false, effect: 'deny', obligations: [], reason: 'NO_MATCHING_GUARD', audit: this.auditTrail };
    }

    return {
      allowed: matched.effect === 'allow',
      effect: matched.effect,
      guardId: matched.id,
      obligations: matched.obligations,
      reason: matched.reason,
      audit: this.auditTrail,
    };
  }

  private buildContext(request: AgentAccessRequest) {
    const action = `tool:${request.toolId}`;
    const resource = `graph:${request.graphNamespace ?? 'any'}`;
    const riskLevel = normalizeTag(request.agent.riskLevel, 'risk:');
    const authorities = [
      normalizeTag(request.agent.role, 'role:'),
      riskLevel,
      ...((request.agent.tags ?? []).map((tag) => normalizeTag(tag, 'tag:'))),
      ...((request.tags ?? []).map((tag) => normalizeTag(tag, 'tag:'))),
    ];
    const licenses = request.model ? [request.model] : [];

    return { action, resource, authorities, licenses, riskLevel };
  }
}
