import {
  type ActionOutcome,
  type AgentIdentity,
  type AgentLifecycleEvent,
  type AgentStatus,
  type SecurityContext,
  type SecurityControl,
  type SecurityEvaluation,
} from './types.js';

const allowedLifecycleTransitions: Record<AgentStatus, AgentStatus[]> = {
  provisioned: ['active', 'retired'],
  active: ['suspended', 'retired'],
  suspended: ['active', 'retired'],
  retired: [],
};

export class SecurityControlPlane {
  private readonly controls: SecurityControl[] = [];

  private readonly audits: ActionOutcome[] = [];

  registerControl(control: SecurityControl): void {
    this.controls.push(control);
  }

  listControls(): string[] {
    return this.controls.map((control) => control.name);
  }

  evaluateAction(context: SecurityContext): SecurityEvaluation {
    const results = this.controls.map((control) => control.evaluate(context));
    const allowed = results.every((result) => result.allowed);
    const reasons = results.flatMap((result) => result.reasons);
    const obligations = results.flatMap((result) => result.obligations);
    this.audits.push({
      action: context.action,
      allowed,
      reasons,
    });
    return { allowed, reasons, obligations };
  }

  getAuditLog(): ActionOutcome[] {
    return [...this.audits];
  }

  static buildDefaultControls(): SecurityControl[] {
    return [
      {
        name: 'mtls-enforced',
        evaluate: (context) => {
          if (!context.mtls) {
            return {
              allowed: false,
              reasons: ['mTLS validation missing'],
              obligations: ['validate identity'],
            };
          }
          if (!context.mtls.allowed) {
            return {
              allowed: false,
              reasons: context.mtls.reasons.length
                ? context.mtls.reasons
                : ['mTLS validation failed'],
              obligations: ['block connection'],
            };
          }
          return { allowed: true, reasons: [], obligations: [] };
        },
      },
      {
        name: 'allowed-action-policy',
        evaluate: (context) => {
          if (!context.agent.allowedActions.includes(context.action.name)) {
            return {
              allowed: false,
              reasons: [`action ${context.action.name} not permitted`],
              obligations: ['deny'],
            };
          }
          return { allowed: true, reasons: [], obligations: [] };
        },
      },
      {
        name: 'minimum-assurance',
        evaluate: (context) => {
          if (context.agent.assurance < 0.8) {
            return {
              allowed: false,
              reasons: ['agent assurance score below threshold'],
              obligations: ['request re-attestation'],
            };
          }
          return { allowed: true, reasons: [], obligations: [] };
        },
      },
    ];
  }
}

export function enforceLifecycle(
  current: AgentStatus,
  next: AgentStatus,
): AgentLifecycleEvent {
  const allowedTransitions = allowedLifecycleTransitions[current];
  if (!allowedTransitions.includes(next)) {
    throw new Error(`invalid lifecycle transition from ${current} to ${next}`);
  }
  return { timestamp: new Date().toISOString(), status: next, reason: 'policy' };
}

export function computeAssurance(agent: AgentIdentity): number {
  const capabilityWeight = agent.allowedActions.length > 0
    ? Math.min(1, agent.allowedActions.length / 10)
    : 0;
  const tenantWeight = agent.tenantId ? 0.1 : 0;
  return Math.min(1, 0.7 + capabilityWeight + tenantWeight);
}
