// @ts-nocheck
import { LLMRequest, LLMResponse } from './types.js';
import { TenantPolicy } from './policy-store.js';

interface TenantUsage {
  monthKey: string;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
}

export class CostTracker {
  private usage: Map<string, TenantUsage> = new Map();

  private monthKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
  }

  private ensureTenant(tenantId: string) {
    const key = this.monthKey();
    const existing = this.usage.get(tenantId);
    if (!existing || existing.monthKey !== key) {
      this.usage.set(tenantId, {
        monthKey: key,
        costUsd: 0,
        promptTokens: 0,
        completionTokens: 0,
      });
    }
  }

  canSpend(
    tenantId: string,
    estimatedCost: number,
    policy: TenantPolicy,
  ): { allowed: boolean; softExceeded: boolean } {
    this.ensureTenant(tenantId);
    const usage = this.usage.get(tenantId)!;
    const projected = usage.costUsd + estimatedCost;
    if (projected > policy.monthlyCost.hard) {
      return { allowed: false, softExceeded: true };
    }
    const softExceeded = projected > policy.monthlyCost.soft;
    return { allowed: true, softExceeded };
  }

  record(tenantId: string, request: LLMRequest, response: LLMResponse, policy: TenantPolicy) {
    this.ensureTenant(tenantId);
    const usage = this.usage.get(tenantId)!;
    const promptTokens = response.usage.promptTokens || 0;
    const completionTokens = response.usage.completionTokens || 0;
    const totalCost =
      response.usage.cost ??
      ((promptTokens + completionTokens) / 1000) * 0.0001; // fallback negligible estimate
    usage.promptTokens += promptTokens;
    usage.completionTokens += completionTokens;
    usage.costUsd += totalCost;
    this.usage.set(tenantId, usage);
  }

  getUsage(tenantId: string): TenantUsage | undefined {
    this.ensureTenant(tenantId);
    return this.usage.get(tenantId);
  }
}
