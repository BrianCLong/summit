export interface PolicyContext {
  identity: string;
  tenant: string;
  budget?: {
    limit: number;
    consumed: number;
  };
}

export interface PolicyRequest {
  capability: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
}

export class PolicyPreflight {
  private allowedActions: Set<string> = new Set();

  constructor(initialAllowedActions: string[] = []) {
    initialAllowedActions.forEach(action => this.allowedActions.add(action));
  }

  public evaluate(context: PolicyContext, request: PolicyRequest): PolicyDecision {
    // 1. Default Deny
    let decision: PolicyDecision = {
      allow: false,
      reason: 'Default deny: action not explicitly allowed by policy',
    };

    // 2. Check explicitly allowed actions
    const actionKey = `${request.capability}:${request.action}`;
    if (this.allowedActions.has(actionKey)) {
      decision = { allow: true };
    }

    // 3. Check budget if present
    if (decision.allow && context.budget) {
      if (context.budget.consumed >= context.budget.limit) {
        decision = {
          allow: false,
          reason: `Policy deny: budget limit exceeded (${context.budget.consumed} >= ${context.budget.limit})`,
        };
      }
    }

    // 4. Identity/Tenant checks (minimal for now)
    if (decision.allow && (!context.identity || !context.tenant)) {
      decision = {
        allow: false,
        reason: 'Policy deny: missing identity or tenant context',
      };
    }

    return decision;
  }
}
