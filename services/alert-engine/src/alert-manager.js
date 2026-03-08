"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertManager = void 0;
const events_1 = require("events");
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const alert_types_1 = require("./alert-types");
const alert_router_1 = require("./alert-router");
const alert_suppression_1 = require("./alert-suppression");
const logger = (0, pino_1.default)({ name: 'alert-manager' });
/**
 * Central alert management system
 */
class AlertManager extends events_1.EventEmitter {
    rules = new Map();
    activeAlerts = new Map();
    redis = null;
    router;
    suppressor;
    constructor(redisUrl) {
        super();
        if (redisUrl) {
            this.redis = new ioredis_1.default(redisUrl);
        }
        this.router = new alert_router_1.AlertRouter();
        this.suppressor = new alert_suppression_1.AlertSuppressor();
    }
    /**
     * Add alert rule
     */
    addRule(rule) {
        this.rules.set(rule.id, rule);
        logger.info({ ruleId: rule.id, name: rule.name }, 'Alert rule added');
    }
    /**
     * Process event and check alert rules
     */
    async processEvent(event) {
        const triggeredAlerts = [];
        for (const rule of this.rules.values()) {
            if (!rule.enabled) {
                continue;
            }
            try {
                if (rule.condition(event)) {
                    const alert = await this.createAlert(rule, event);
                    // Check suppression
                    if (!this.suppressor.shouldSuppress(alert, rule.suppressionRules)) {
                        await this.triggerAlert(alert, rule);
                        triggeredAlerts.push(alert);
                    }
                    else {
                        logger.debug({ alertId: alert.id }, 'Alert suppressed');
                        alert.status = alert_types_1.AlertStatus.SUPPRESSED;
                    }
                }
            }
            catch (error) {
                logger.error({ error, ruleId: rule.id }, 'Alert rule evaluation failed');
            }
        }
        return triggeredAlerts;
    }
    /**
     * Create alert from rule and event
     */
    async createAlert(rule, event) {
        const alertId = `${rule.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const alert = {
            id: alertId,
            title: rule.name,
            description: rule.description || '',
            severity: rule.severity,
            status: alert_types_1.AlertStatus.TRIGGERED,
            source: event.source || 'unknown',
            timestamp: Date.now(),
            metadata: {
                ruleId: rule.id,
                event,
            },
            tags: event.tags || [],
        };
        return alert;
    }
    /**
     * Trigger alert and send notifications
     */
    async triggerAlert(alert, rule) {
        // Store alert
        this.activeAlerts.set(alert.id, alert);
        if (this.redis) {
            await this.redis.setex(`alert:${alert.id}`, 86400, // 24 hours
            JSON.stringify(alert));
            // Add to active alerts list
            await this.redis.zadd('active-alerts', Date.now(), alert.id);
        }
        // Route to notification channels
        await this.router.routeAlert(alert, rule.notificationChannels);
        // Handle escalation
        if (rule.escalationPolicy) {
            this.handleEscalation(alert, rule);
        }
        this.emit('alert-triggered', alert);
        logger.info({ alertId: alert.id, severity: alert.severity }, 'Alert triggered');
    }
    /**
     * Handle alert escalation
     */
    handleEscalation(alert, rule) {
        if (!rule.escalationPolicy) {
            return;
        }
        for (const level of rule.escalationPolicy.levels) {
            setTimeout(async () => {
                // Check if alert is still active
                const currentAlert = this.activeAlerts.get(alert.id);
                if (currentAlert &&
                    currentAlert.status === alert_types_1.AlertStatus.TRIGGERED &&
                    (!level.condition || level.condition(currentAlert))) {
                    await this.router.routeAlert(currentAlert, level.channels);
                    this.emit('alert-escalated', { alert: currentAlert, level });
                }
            }, level.delayMs);
        }
    }
    /**
     * Acknowledge alert
     */
    async acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        alert.status = alert_types_1.AlertStatus.ACKNOWLEDGED;
        alert.metadata.acknowledgedBy = acknowledgedBy;
        alert.metadata.acknowledgedAt = Date.now();
        if (this.redis) {
            await this.redis.setex(`alert:${alertId}`, 86400, JSON.stringify(alert));
        }
        this.emit('alert-acknowledged', alert);
        logger.info({ alertId, acknowledgedBy }, 'Alert acknowledged');
    }
    /**
     * Resolve alert
     */
    async resolveAlert(alertId, resolvedBy) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        alert.status = alert_types_1.AlertStatus.RESOLVED;
        alert.metadata.resolvedBy = resolvedBy;
        alert.metadata.resolvedAt = Date.now();
        this.activeAlerts.delete(alertId);
        if (this.redis) {
            await this.redis.setex(`alert:${alertId}`, 86400, JSON.stringify(alert));
            await this.redis.zrem('active-alerts', alertId);
        }
        this.emit('alert-resolved', alert);
        logger.info({ alertId, resolvedBy }, 'Alert resolved');
    }
    /**
     * Get active alerts
     */
    async getActiveAlerts(options) {
        let alerts = Array.from(this.activeAlerts.values());
        if (options?.severity) {
            alerts = alerts.filter((a) => a.severity === options.severity);
        }
        if (options?.source) {
            alerts = alerts.filter((a) => a.source === options.source);
        }
        if (options?.limit) {
            alerts = alerts.slice(0, options.limit);
        }
        return alerts.sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Get alert statistics
     */
    async getStatistics() {
        const alerts = Array.from(this.activeAlerts.values());
        return {
            total: alerts.length,
            bySeverity: {
                critical: alerts.filter((a) => a.severity === alert_types_1.AlertSeverity.CRITICAL).length,
                high: alerts.filter((a) => a.severity === alert_types_1.AlertSeverity.HIGH).length,
                medium: alerts.filter((a) => a.severity === alert_types_1.AlertSeverity.MEDIUM).length,
                low: alerts.filter((a) => a.severity === alert_types_1.AlertSeverity.LOW).length,
                info: alerts.filter((a) => a.severity === alert_types_1.AlertSeverity.INFO).length,
            },
            byStatus: {
                triggered: alerts.filter((a) => a.status === alert_types_1.AlertStatus.TRIGGERED).length,
                acknowledged: alerts.filter((a) => a.status === alert_types_1.AlertStatus.ACKNOWLEDGED).length,
                resolved: alerts.filter((a) => a.status === alert_types_1.AlertStatus.RESOLVED).length,
                suppressed: alerts.filter((a) => a.status === alert_types_1.AlertStatus.SUPPRESSED).length,
            },
        };
    }
}
exports.AlertManager = AlertManager;
