import { randomUUID } from "node:crypto";
import { AccessRequest, DecisionLogEntry, PolicyBundle, PolicyRule } from "../types.js";

export class PolicyEngine {
  private bundle: PolicyBundle;
  private decisions: DecisionLogEntry[] = [];

  constructor(bundle: PolicyBundle) {
    this.bundle = bundle;
  }

  updateBundle(bundle: PolicyBundle) {
    this.bundle = bundle;
  }

  getDecisionLog(): DecisionLogEntry[] {
    return [...this.decisions];
  }

  evaluate(request: AccessRequest, traceId = randomUUID()): boolean {
    const matchedRule = this.findMatchingRule(request);
    const decision = matchedRule?.effect ?? this.bundle.fallbackEffect ?? "deny";
    this.decisions.push({
      traceId,
      timestamp: new Date().toISOString(),
      request,
      decision,
      ruleId: matchedRule?.id,
    });
    return decision === "allow";
  }

  private findMatchingRule(request: AccessRequest): PolicyRule | undefined {
    return this.bundle.rules.find(
      (rule) =>
        rule.role === request.role &&
        rule.resource === request.resource &&
        rule.action === request.action &&
        (rule.tenant ? rule.tenant === request.tenant : true) &&
        (rule.region ? rule.region === request.region : true) &&
        (rule.maxClassification
          ? this.classificationRank(request.classification) <=
            this.classificationRank(rule.maxClassification)
          : true)
    );
  }

  private classificationRank(level: AccessRequest["classification"]): number {
    const order: AccessRequest["classification"][] = [
      "public",
      "internal",
      "confidential",
      "secret",
    ];
    return order.indexOf(level);
  }
}

export const denyByDefaultBundle: PolicyBundle = {
  version: "1.0.0",
  rules: [],
  fallbackEffect: "deny",
};
