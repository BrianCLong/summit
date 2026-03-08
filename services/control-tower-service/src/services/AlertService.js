"use strict";
/**
 * Alert Service - Manages alerts and alert rules
 * @module @intelgraph/control-tower-service/services/AlertService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = void 0;
const uuid_1 = require("uuid");
class AlertService {
    repository;
    notificationService;
    constructor(repository, notificationService) {
        this.repository = repository;
        this.notificationService = notificationService;
    }
    /**
     * Get alert by ID
     */
    async getAlert(id, context) {
        return this.repository.findAlertById(id);
    }
    /**
     * Get alerts with filtering and pagination
     */
    async getAlerts(first, after, status, severity, context) {
        return this.repository.findAlerts(first, after, { status, severity });
    }
    /**
     * Evaluate an event against all rules and trigger alerts
     */
    async evaluateEvent(event) {
        const rules = await this.repository.findRules(true);
        const triggeredAlerts = [];
        for (const rule of rules) {
            if (this.eventMatchesRule(event, rule)) {
                // Check cooldown
                if (rule.lastTriggeredAt && rule.cooldownSeconds) {
                    const cooldownEnd = new Date(rule.lastTriggeredAt.getTime() + rule.cooldownSeconds * 1000);
                    if (new Date() < cooldownEnd) {
                        continue; // Skip, still in cooldown
                    }
                }
                const alert = await this.triggerAlert(rule, event);
                triggeredAlerts.push(alert);
            }
        }
        return triggeredAlerts;
    }
    /**
     * Trigger an alert from a rule
     */
    async triggerAlert(rule, event) {
        const alert = await this.repository.createAlert({
            rule,
            severity: rule.severity,
            status: AlertStatus.ACTIVE,
            title: `${rule.name}: ${event.title}`,
            message: `Alert triggered by rule "${rule.name}" for event: ${event.title}`,
            triggeringEvent: event,
            triggeredAt: new Date(),
            notifications: [],
        });
        // Update rule trigger count
        await this.repository.incrementRuleTriggerCount(rule.id);
        // Send notifications
        const notifications = await this.sendNotifications(alert, rule);
        // Update alert with notifications
        return this.repository.updateAlert(alert.id, { notifications });
    }
    /**
     * Send notifications for an alert
     */
    async sendNotifications(alert, rule) {
        const notifications = [];
        for (const channel of rule.channels) {
            for (const recipient of rule.recipients) {
                const result = await this.notificationService.send(channel, recipient, {
                    title: alert.title,
                    body: alert.message,
                    url: `/control-tower/alerts/${alert.id}`,
                });
                notifications.push({
                    id: (0, uuid_1.v4)(),
                    channel,
                    recipient,
                    sentAt: new Date(),
                    delivered: result.delivered,
                    error: result.error,
                });
            }
        }
        return notifications;
    }
    /**
     * Check if an event matches a rule's conditions
     */
    eventMatchesRule(event, rule) {
        const conditions = rule.conditions;
        // Check severity
        if (conditions.severity && !conditions.severity.includes(event.severity)) {
            return false;
        }
        // Check source
        if (conditions.source && !conditions.source.includes(event.source)) {
            return false;
        }
        // Check category
        if (conditions.category && !conditions.category.includes(event.category)) {
            return false;
        }
        // Check keywords in title/description
        if (conditions.keywords) {
            const text = `${event.title} ${event.description || ''}`.toLowerCase();
            const hasKeyword = conditions.keywords.some(kw => text.includes(kw.toLowerCase()));
            if (!hasKeyword) {
                return false;
            }
        }
        return true;
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId, context) {
        const alert = await this.repository.findAlertById(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        if (alert.status !== AlertStatus.ACTIVE) {
            throw new Error(`Cannot acknowledge alert in status: ${alert.status}`);
        }
        return this.repository.updateAlert(alertId, {
            status: AlertStatus.ACKNOWLEDGED,
            acknowledgedAt: new Date(),
            acknowledgedBy: context.user,
        });
    }
    /**
     * Snooze an alert
     */
    async snoozeAlert(alertId, durationMinutes, context) {
        const alert = await this.repository.findAlertById(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        const snoozedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
        return this.repository.updateAlert(alertId, {
            status: AlertStatus.SNOOZED,
            snoozedUntil,
        });
    }
    /**
     * Dismiss an alert
     */
    async dismissAlert(alertId, reason, context) {
        const alert = await this.repository.findAlertById(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        return this.repository.updateAlert(alertId, {
            status: AlertStatus.DISMISSED,
        });
    }
    // ============================================================================
    // Alert Rules
    // ============================================================================
    /**
     * Get alert rule by ID
     */
    async getAlertRule(id, context) {
        return this.repository.findRuleById(id);
    }
    /**
     * Get all alert rules
     */
    async getAlertRules(enabled, context) {
        return this.repository.findRules(enabled);
    }
    /**
     * Create a new alert rule
     */
    async createAlertRule(input, context) {
        return this.repository.createRule({
            ...input,
            enabled: input.enabled ?? true,
            createdBy: context.user,
        });
    }
    /**
     * Update an alert rule
     */
    async updateAlertRule(id, input, context) {
        const rule = await this.repository.findRuleById(id);
        if (!rule) {
            throw new Error(`Alert rule not found: ${id}`);
        }
        return this.repository.updateRule(id, {
            ...input,
            updatedAt: new Date(),
        });
    }
    /**
     * Delete an alert rule
     */
    async deleteAlertRule(id, context) {
        const rule = await this.repository.findRuleById(id);
        if (!rule) {
            throw new Error(`Alert rule not found: ${id}`);
        }
        return this.repository.deleteRule(id);
    }
}
exports.AlertService = AlertService;
