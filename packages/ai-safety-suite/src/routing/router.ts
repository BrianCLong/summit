import crypto from "crypto";

export interface RoutingPolicy {
  feature: string;
  defaultModel: string;
  fallbacks?: string[];
  canaryPercent?: number;
}

export interface RoutingDecision {
  model?: string;
  usedFallback?: boolean;
  disabled: boolean;
  code?: "AI_DISABLED" | "NO_MODEL_AVAILABLE";
}

export class ModelRouter {
  private killSwitch = false;
  private featureKill = new Set<string>();
  private policies = new Map<string, RoutingPolicy>();

  constructor(policies: RoutingPolicy[] = []) {
    policies.forEach((policy) => this.policies.set(policy.feature, policy));
  }

  setKillSwitch(enabled: boolean, feature?: string): void {
    if (feature) {
      if (enabled) {
        this.featureKill.add(feature);
      } else {
        this.featureKill.delete(feature);
      }
      return;
    }
    this.killSwitch = enabled;
  }

  resolve(feature: string, tenantId: string): RoutingDecision {
    if (this.killSwitch || this.featureKill.has(feature)) {
      return { disabled: true, code: "AI_DISABLED" };
    }

    const policy = this.policies.get(feature);
    if (!policy) {
      return { disabled: true, code: "NO_MODEL_AVAILABLE" };
    }

    const inCanary = this.isTenantInCanary(tenantId, policy.canaryPercent ?? 0);
    const model = inCanary && policy.fallbacks?.length ? policy.fallbacks[0] : policy.defaultModel;

    return {
      model,
      usedFallback: inCanary && !!policy.fallbacks?.length,
      disabled: false,
    };
  }

  private isTenantInCanary(tenantId: string, percent: number): boolean {
    if (percent <= 0) return false;
    if (percent >= 100) return true;
    const hash = crypto.createHash("sha256").update(tenantId).digest("hex");
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    return bucket < percent;
  }
}
