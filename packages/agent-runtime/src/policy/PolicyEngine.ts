export type PolicyAction =
  | { kind: "model.call"; model: string }
  | { kind: "sandbox.exec"; command: string }
  | { kind: "browser.navigate"; url: string }
  | { kind: "browser.click"; selector: string };

export type PolicyDecision =
  | { allow: true }
  | { allow: false; reason: string };

export interface PolicyContext {
  principalId: string;
  sessionId: string;
  // never-log fields must be kept out of logs by callers
}

export interface PolicyEngine {
  authorize(action: PolicyAction, ctx: PolicyContext): PolicyDecision;
}

// Default engine: DENY EVERYTHING unless explicitly allowed by config.
export class DenyByDefaultPolicyEngine implements PolicyEngine {
  authorize(_action: PolicyAction, _ctx: PolicyContext): PolicyDecision {
    return { allow: false, reason: "deny-by-default" };
  }
}
