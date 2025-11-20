import { getRedisClient } from '../db/redis.js';
import pino from 'pino';
import { z } from 'zod/v4';

const logger = pino();

export const AlertRuleSchema = z.object({
  id: z.string().uuid(),
  metric: z.string(),
  operator: z.enum(['>', '<', '>=', '<=', '==']),
  threshold: z.number(),
  message: z.string(),
  enabled: z.boolean().default(true),
});

export type AlertRule = z.infer<typeof AlertRuleSchema>;

export interface AlertEvent {
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
}

class AlertingService {
  private redis: any;
  private rules = new Map<string, AlertRule[]>();

  constructor() {
      try {
        this.redis = getRedisClient();
      } catch (e) {
        console.error("Failed to get redis client in AlertingService", e);
      }
      // Load rules from DB/Redis on startup?
      // For now, we'll use in-memory rules populated via API or hardcoded for demo
      this.addRule({
          id: '00000000-0000-0000-0000-000000000001',
          metric: 'cpu_usage',
          operator: '>',
          threshold: 90,
          message: 'High CPU Usage',
          enabled: true
      });
  }

  addRule(rule: AlertRule) {
    const metricRules = this.rules.get(rule.metric) || [];
    metricRules.push(rule);
    this.rules.set(rule.metric, metricRules);
  }

  async checkAlerts(metric: string, value: number, tags: Record<string, string> = {}) {
    const rules = this.rules.get(metric);
    if (!rules) return;

    for (const rule of rules) {
      if (!rule.enabled) continue;

      let triggered = false;
      switch (rule.operator) {
        case '>': triggered = value > rule.threshold; break;
        case '<': triggered = value < rule.threshold; break;
        case '>=': triggered = value >= rule.threshold; break;
        case '<=': triggered = value <= rule.threshold; break;
        case '==': triggered = value === rule.threshold; break;
      }

      if (triggered) {
        const alert: AlertEvent = {
          ruleId: rule.id,
          metric,
          value,
          threshold: rule.threshold,
          message: rule.message,
          timestamp: Date.now()
        };

        logger.info({ alert }, 'Alert triggered');

        // Publish alert
        await this.redis.publish(`alert:${metric}`, JSON.stringify(alert));
        await this.redis.publish('alerts', JSON.stringify(alert)); // Global alerts channel
      }
    }
  }
}

export const alertingService = new AlertingService();

// Export the class for testing if needed to instantiate with mocks
export { AlertingService };
