import { createHash } from 'node:crypto';
import type { PolicyObligation } from 'common-types';
import type { OpaGuard } from './authority-compiler.js';

export interface AuthorizationContext {
  action: string;
  resource: string;
  actor: string;
  roles: string[];
  license?: string;
  justification?: string;
  datasetSensitivity?: string;
  budgetRru?: number;
  timeWindow?: string;
}

export interface AuthorizationDecision {
  decision: 'allow' | 'deny';
  guardId?: string;
  obligations: PolicyObligation[];
  reason: string;
  policyVersion?: string;
  auditHash: string;
  appealLink?: string;
  selector?: OpaGuard['selector'];
}

function stableHash(payload: unknown): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(payload, Object.keys(payload as object).sort()));
  return hash.digest('hex');
}

function selectorMatches(guard: OpaGuard, context: AuthorizationContext): boolean {
  const matchesAction = guard.selector.actions.includes(context.action);
  const matchesResource = guard.selector.resources.includes(context.resource);
  const matchesAuthority =
    guard.selector.authorities.length === 0 ||
    guard.selector.authorities.some((authority) => context.roles.includes(authority));
  const matchesLicense =
    guard.selector.licenses.length === 0 ||
    (context.license ? guard.selector.licenses.includes(context.license) : false);
  return matchesAction && matchesResource && matchesAuthority && matchesLicense;
}

export class AuthorityBytecodeEngine {
  private readonly guards: OpaGuard[];
  private readonly appealBase: string;

  constructor(guards: OpaGuard[], appealBase?: string) {
    this.guards = guards.map((guard) => ({
      ...guard,
      selector: {
        actions: [...guard.selector.actions].sort(),
        resources: [...guard.selector.resources].sort(),
        authorities: [...guard.selector.authorities].sort(),
        licenses: [...guard.selector.licenses].sort(),
      },
    }));
    this.appealBase = appealBase ?? 'https://appeals.graph.local/tickets';
  }

  authorize(context: AuthorizationContext): AuthorizationDecision {
    const matched = this.guards.find((guard) => selectorMatches(guard, context));
    const basePayload = {
      actor: context.actor,
      action: context.action,
      resource: context.resource,
      license: context.license ?? 'unspecified',
      justification: context.justification ?? 'none',
      sensitivity: context.datasetSensitivity ?? 'unknown',
    };

    if (!matched) {
      return {
        decision: 'deny',
        obligations: [],
        reason: 'No matching policy; deny by default with appeal path.',
        auditHash: stableHash({ ...basePayload, decision: 'deny' }),
        appealLink: `${this.appealBase}?reason=no-policy&resource=${context.resource}`,
      };
    }

    const justificationRequired = matched.obligations.some(
      (obligation) => obligation.type === 'require-justification',
    );
    if (justificationRequired && !context.justification) {
      return {
        decision: 'deny',
        guardId: matched.id,
        obligations: matched.obligations,
        reason: 'Justification required by policy.',
        policyVersion: matched.package,
        auditHash: stableHash({ ...basePayload, decision: 'deny', guard: matched.id }),
        appealLink: `${this.appealBase}?guard=${matched.id}`,
        selector: matched.selector,
      };
    }

    const auditHash = stableHash({
      ...basePayload,
      decision: matched.effect,
      guard: matched.id,
      obligations: matched.obligations,
    });

    return {
      decision: matched.effect === 'deny' ? 'deny' : 'allow',
      guardId: matched.id,
      obligations: matched.obligations,
      reason: matched.reason ?? 'Policy evaluated successfully.',
      policyVersion: matched.package,
      auditHash,
      appealLink: `${this.appealBase}?guard=${matched.id}`,
      selector: matched.selector,
    };
  }
}
