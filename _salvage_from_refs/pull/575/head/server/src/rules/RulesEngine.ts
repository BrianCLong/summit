import { AlertsStore } from '../alerts/AlertsStore';

export type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  when: {
    type: 'counter' | 'pattern';
    expr: string;
    window?: number;
    threshold?: number;
    dedupeKey?: string;
    cooldownMs?: number;
    dryRun?: boolean;
  };
  then: { action: 'alert'; message: string; tags?: string[] };
};

export class RulesEngine {
  private lastFired = new Map<string, number>();
  constructor(private alerts: AlertsStore) {}

  async evalPattern(rule: Rule) {
    if (!rule.when.dryRun) {
      this.emit(rule, {});
    }
  }

  observeCounter(rule: Rule, value: number) {
    if (rule.when.threshold && value >= rule.when.threshold) {
      if (!rule.when.dryRun) {
        this.emit(rule, { value });
      }
    }
  }

  private emit(rule: Rule, extra: any) {
    const now = Date.now();
    const dedupe = rule.when.dedupeKey;
    if (dedupe) {
      const last = this.lastFired.get(dedupe);
      if (last && rule.when.cooldownMs && now - last < rule.when.cooldownMs) {
        return;
      }
      this.lastFired.set(dedupe, now);
    }
    this.alerts.create({
      ruleId: rule.id,
      tenantId: 'tenant',
      severity: rule.severity,
      message: rule.then.message,
      at: new Date().toISOString(),
      dedupeKey: dedupe,
      meta: extra,
    });
  }
}
