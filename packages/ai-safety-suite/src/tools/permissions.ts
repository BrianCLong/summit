export type RiskLevel = "low" | "medium" | "high";

export interface PolicyContext {
  tenantId: string;
  route: string;
  riskLevel: RiskLevel;
  actor?: string;
}

export interface ToolPolicy {
  toolName: string;
  minRiskLevel?: RiskLevel;
}

export interface ToolDecision {
  allowed: boolean;
  code: "TOOL_ALLOWED" | "TOOL_DENIED";
  reason: string;
}

export interface AuditEvent {
  timestamp: number;
  tenantId: string;
  route: string;
  toolName: string;
  allowed: boolean;
  reason: string;
  context: PolicyContext & { requestReason: string };
}

export class ToolPermissionGateway {
  private allowlist = new Map<string, ToolPolicy[]>();
  private auditLog: AuditEvent[] = [];

  setPolicies(route: string, policies: ToolPolicy[]): void {
    this.allowlist.set(route, policies);
  }

  evaluate(toolName: string, context: PolicyContext, requestReason: string): ToolDecision {
    const policies = this.allowlist.get(context.route) ?? [];
    const allowed = policies.some((policy) => {
      if (policy.toolName !== toolName) {
        return false;
      }
      if (!policy.minRiskLevel) {
        return true;
      }
      const riskOrder: RiskLevel[] = ["low", "medium", "high"];
      return riskOrder.indexOf(context.riskLevel) >= riskOrder.indexOf(policy.minRiskLevel);
    });

    const decision: ToolDecision = {
      allowed,
      code: allowed ? "TOOL_ALLOWED" : "TOOL_DENIED",
      reason: allowed
        ? "Tool is allowlisted for route"
        : "Tool is not allowlisted for this route/risk",
    };

    this.auditLog.push({
      timestamp: Date.now(),
      tenantId: context.tenantId,
      route: context.route,
      toolName,
      allowed,
      reason: decision.reason,
      context: { ...context, requestReason },
    });

    return decision;
  }

  getAuditLog(): AuditEvent[] {
    return [...this.auditLog];
  }
}
