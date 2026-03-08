"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertingService = exports.alertingService = exports.AlertRuleSchema = void 0;
const redis_js_1 = require("../db/redis.js");
const pino_1 = __importDefault(require("pino"));
const z = __importStar(require("zod"));
const SuppressionService_js_1 = require("./alert/SuppressionService.js");
const CorrelationService_js_1 = require("./alert/CorrelationService.js");
const crypto_1 = __importDefault(require("crypto"));
const logger = pino_1.default();
/**
 * @const AlertRuleSchema
 * @description Zod schema for validating alert rules.
 */
exports.AlertRuleSchema = z.object({
    id: z.string().uuid(),
    metric: z.string(),
    operator: z.enum(['>', '<', '>=', '<=', '==']),
    threshold: z.number(),
    message: z.string(),
    enabled: z.boolean().default(true),
});
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
// AlertEvent interface is now imported from ../types/alerts.js
// Re-exporting it or using the imported one.
// The local interface definition is removed to avoid conflict and duplication.
/**
 * @class AlertingService
 * @description Manages alert rules and checks incoming metric data against them.
 * When a rule's condition is met, it publishes an alert event to Redis.
 *
 * @example
 * ```typescript
 * import { alertingService, AlertRuleSchema } from './AlertingService.js';
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
    redis = null;
    rules = new Map();
    /**
     * @constructor
     * @description Initializes the AlertingService, connects to Redis, and loads initial rules.
     */
    constructor() {
        try {
            this.redis = (0, redis_js_1.getRedisClient)();
        }
        catch (e) {
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
    addRule(rule) {
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
    // Simple flood control: map of ruleId -> timestamp of last alert
    lastAlertByRule = new Map();
    // Flood threshold: min 1 second between alerts per rule
    floodThresholdMs = 1000;
    async checkAlerts(metric, value, tags = {}) {
        const rules = this.rules.get(metric);
        if (!rules || !this.redis)
            return;
        for (const rule of rules) {
            if (!rule.enabled)
                continue;
            let triggered = false;
            switch (rule.operator) {
                case '>':
                    triggered = value > rule.threshold;
                    break;
                case '<':
                    triggered = value < rule.threshold;
                    break;
                case '>=':
                    triggered = value >= rule.threshold;
                    break;
                case '<=':
                    triggered = value <= rule.threshold;
                    break;
                case '==':
                    triggered = value === rule.threshold;
                    break;
            }
            if (triggered) {
                // Construct the AlertEvent
                const entityKey = tags.entityId || 'global';
                const alert = {
                    id: crypto_1.default.randomUUID(),
                    ruleId: rule.id,
                    metric,
                    value,
                    threshold: rule.threshold,
                    message: rule.message,
                    timestamp: Date.now(),
                    entities: [entityKey],
                    attributes: tags
                };
                // Check suppressions
                if (SuppressionService_js_1.suppressionService.isSuppressed(rule.id, entityKey, alert.timestamp)) {
                    logger.info({ alertId: alert.id, ruleId: rule.id }, 'Alert suppressed');
                    continue;
                }
                // Check flood control (Circuit Breaker)
                const lastTime = this.lastAlertByRule.get(rule.id) || 0;
                if (alert.timestamp - lastTime < this.floodThresholdMs) {
                    logger.warn({ ruleId: rule.id }, 'Alert flood detected, dropping alert');
                    continue; // Drop alert
                }
                this.lastAlertByRule.set(rule.id, alert.timestamp);
                logger.info({ alert }, 'Alert triggered');
                // Feed to correlation engine (fire and forget for this MVP step, or await/process)
                // In a real system, this might push to a queue that the correlator consumes.
                // Here we just invoke it directly for demonstration.
                const incidents = CorrelationService_js_1.correlationService.correlate([alert]);
                if (incidents.length > 0) {
                    logger.info({ incidentCount: incidents.length }, 'Correlated incidents generated');
                    // Publish incidents to Redis as well
                    await this.redis.publish('incidents', JSON.stringify(incidents));
                }
                // Publish alert to a metric-specific channel and a global channel
                await this.redis.publish(`alert:${metric}`, JSON.stringify(alert));
                await this.redis.publish('alerts', JSON.stringify(alert)); // Global alerts channel
            }
        }
    }
}
exports.AlertingService = AlertingService;
/**
 * @const alertingService
 * @description A singleton instance of the AlertingService.
 */
exports.alertingService = new AlertingService();
