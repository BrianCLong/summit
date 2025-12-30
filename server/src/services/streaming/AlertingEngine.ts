
export interface AlertRule {
  id: string;
  name: string;
  condition: 'gt' | 'lt' | 'eq';
  metric: 'velocity' | 'confidence' | 'evidence_count';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface AlertContext {
  investigationId: string;
  tenantId: string;
  metrics: Record<string, number>;
  event: any;
}

export class AlertingEngine {
  private rules: Map<string, AlertRule[]> = new Map(); // tenantId -> rules

  constructor() {
    // Initialize with some default rules
    this.addRule('default', {
      id: 'rule-high-velocity',
      name: 'High Event Velocity',
      condition: 'gt',
      metric: 'velocity',
      threshold: 100, // 100 events per minute
      severity: 'high',
      enabled: true,
    });
  }

  public addRule(tenantId: string, rule: AlertRule) {
    const tenantRules = this.rules.get(tenantId) || [];
    tenantRules.push(rule);
    this.rules.set(tenantId, tenantRules);
  }

  public checkAlerts(context: AlertContext): any[] {
    const triggeredAlerts: any[] = [];
    const tenantRules = this.rules.get(context.tenantId) || this.rules.get('default') || [];

    for (const rule of tenantRules) {
      if (!rule.enabled) {continue;}

      const metricValue = context.metrics[rule.metric];
      if (metricValue === undefined) {continue;}

      let triggered = false;
      switch (rule.condition) {
        case 'gt':
          triggered = metricValue > rule.threshold;
          break;
        case 'lt':
          triggered = metricValue < rule.threshold;
          break;
        case 'eq':
          triggered = metricValue === rule.threshold;
          break;
      }

      if (triggered) {
        triggeredAlerts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          timestamp: Date.now(),
          details: {
            metric: rule.metric,
            value: metricValue,
            threshold: rule.threshold,
            investigationId: context.investigationId,
          },
        });
      }
    }

    return triggeredAlerts;
  }
}
