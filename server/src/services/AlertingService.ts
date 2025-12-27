// @ts-nocheck
import type { Redis } from 'ioredis';
import { getRedisClient } from '../db/redis.js';
import pino from 'pino';
import * as z from 'zod';

const logger = (pino as any)();

/**
 * @const AlertRuleSchema
 * @description Zod schema for validating alert rules.
 */
export const AlertRuleSchema = z.object({
  id: z.string().uuid(),
  metric: z.string(),
  operator: z.enum(['>', '<', '>=', '<=', '==']),
  threshold: z.number(),
  message: z.string(),
  enabled: z.boolean().default(true),
});

/**
 * @typedef AlertRule
 * @description Represents a single, configurable rule for triggering alerts based on metric values.
 */
export type AlertRule = z.infer<typeof AlertRuleSchema>;

/**
 * @interface AlertEvent
 * @description Defines the structure of an alert event that is published when a rule is triggered.
 * @property {string} ruleId - The ID of the rule that was triggered.
 * @property {string} metric - The name of the metric that triggered the alert.
 * @property {number} value - The actual value of the metric that caused the trigger.
 * @property {number} threshold - The threshold value from the rule.
 * @property {string} message - The human-readable message associated with the alert.
 * @property {number} timestamp - The UNIX timestamp (in ms) when the alert was triggered.
 */
export interface AlertEvent {
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
}

/**
 * @class AlertingService
 * @description Manages alert rules and checks incoming metric data against them.
 * When a rule's condition is met, it publishes an alert event to Redis.
 *
 * @example
 * ```typescript
 * import { alertingService, AlertRuleSchema } from './AlertingService';
 *
 * // Add a new rule
 * const newRule = AlertRuleSchema.parse({
 *   id: 'a-new-uuid',
 *   metric: 'memory_usage_percent',
 *   operator: '>',
 *   threshold: 85,
 *   message: 'Memory usage is critically high!',
 *   enabled: true,
 * });
 * alertingService.addRule(newRule);
 *
 * // Check a metric value
 * await alertingService.checkAlerts('memory_usage_percent', 92);
 * ```
 */
class AlertingService {
  private redis: Redis | null = null;
  private rules = new Map<string, AlertRule[]>();

  /**
   * @constructor
   * @description Initializes the AlertingService, connects to Redis, and loads initial rules.
   */
  constructor() {
      try {
        this.redis = getRedisClient();
      } catch (e) {
        logger.error({ error: e instanceof Error ? e.message : String(e) }, "Failed to get redis client in AlertingService");
      }
      // For demonstration, a default rule is added. In a real application,
      // these would be loaded from a persistent data store.
      this.addRule({
          id: '00000000-0000-0000-0000-000000000001',
          metric: 'cpu_usage',
          operator: '>',
          threshold: 90,
          message: 'High CPU Usage',
          enabled: true
      });
  }

  /**
   * @method addRule
   * @description Adds a new alert rule to the service's in-memory store.
   * @param {AlertRule} rule - The alert rule to add.
   * @returns {void}
   */
  addRule(rule: AlertRule): void {
    const metricRules = this.rules.get(rule.metric) || [];
    metricRules.push(rule);
    this.rules.set(rule.metric, metricRules);
  }

  /**
   * @method checkAlerts
   * @description Checks a given metric and value against all registered rules for that metric.
   * If a rule is triggered, it publishes an alert event to the appropriate Redis channels.
   * @param {string} metric - The name of the metric to check (e.g., 'cpu_usage').
   * @param {number} value - The current value of the metric.
   * @param {Record<string, string>} [tags={}] - Optional tags for more complex rule evaluation (currently unused).
   * @returns {Promise<void>}
   */
  async checkAlerts(metric: string, value: number, tags: Record<string, string> = {}): Promise<void> {
    const rules = this.rules.get(metric);
    if (!rules || !this.redis) return;

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

        // Publish alert to a metric-specific channel and a global channel
        await this.redis.publish(`alert:${metric}`, JSON.stringify(alert));
        await this.redis.publish('alerts', JSON.stringify(alert)); // Global alerts channel
      }
    }
  }
}

/**
 * @const alertingService
 * @description A singleton instance of the AlertingService.
 */
export const alertingService = new AlertingService();

// Export the class for testing if needed to instantiate with mocks
export { AlertingService };
