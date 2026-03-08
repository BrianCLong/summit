"use strict";
// @ts-nocheck
/**
 * Alert Plugin
 *
 * Built-in plugin for alert management and notifications.
 *
 * SOC 2 Controls: CC7.2, PI1.1
 *
 * @module plugins/builtin/AlertPlugin
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertPlugin = exports.AlertPlugin = exports.alertPluginManifest = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Plugin Manifest
// ============================================================================
exports.alertPluginManifest = {
    id: 'summit-alerts',
    name: 'Summit Alerts',
    version: '1.0.0',
    description: 'Built-in alert management and notification plugin for governance events',
    author: 'Summit Platform',
    category: 'alerting',
    capabilities: ['read:entities', 'send:notifications', 'audit:read'],
    configSchema: {
        type: 'object',
        properties: {
            webhookUrl: {
                type: 'string',
                description: 'Webhook URL for alert notifications',
            },
            emailRecipients: {
                type: 'array',
                description: 'Email addresses to receive alerts',
            },
            alertThreshold: {
                type: 'number',
                description: 'Minimum severity for alerts (1-5)',
                default: 3,
                minimum: 1,
                maximum: 5,
            },
            enableSlack: {
                type: 'boolean',
                description: 'Enable Slack notifications',
                default: false,
            },
            slackChannel: {
                type: 'string',
                description: 'Slack channel for notifications',
            },
        },
        required: [],
    },
    hooks: [
        { event: 'verdict:denied', handler: 'onVerdictDenied', priority: 1 },
        { event: 'verdict:escalated', handler: 'onVerdictEscalated', priority: 1 },
        { event: 'alert:triggered', handler: 'onAlertTriggered', priority: 1 },
    ],
    tags: ['alerts', 'notifications', 'governance', 'built-in'],
    license: 'MIT',
};
// ============================================================================
// Plugin Implementation
// ============================================================================
class AlertPlugin {
    manifest = exports.alertPluginManifest;
    alerts = new Map();
    rules = new Map();
    async initialize(context) {
        logger_js_1.default.info({ tenantId: context.tenantId }, 'Alert plugin initialized');
    }
    async execute(action, params, context) {
        switch (action) {
            case 'createAlert':
                return this.createAlert(params, context);
            case 'listAlerts':
                return this.listAlerts(params, context);
            case 'acknowledgeAlert':
                return this.acknowledgeAlert(params, context);
            case 'createRule':
                return this.createRule(params, context);
            case 'listRules':
                return this.listRules(context);
            case 'testWebhook':
                return this.testWebhook(context);
            default:
                return {
                    success: false,
                    error: `Unknown action: ${action}`,
                };
        }
    }
    async onEvent(event, payload, context) {
        switch (event) {
            case 'verdict:denied':
                await this.handleVerdictDenied(payload, context);
                break;
            case 'verdict:escalated':
                await this.handleVerdictEscalated(payload, context);
                break;
            case 'alert:triggered':
                await this.handleAlertTriggered(payload, context);
                break;
        }
    }
    async validateConfig(config) {
        const errors = [];
        if (config.webhookUrl && typeof config.webhookUrl !== 'string') {
            errors.push('webhookUrl must be a string');
        }
        if (config.emailRecipients && !Array.isArray(config.emailRecipients)) {
            errors.push('emailRecipients must be an array');
        }
        if (config.alertThreshold !== undefined) {
            const threshold = config.alertThreshold;
            if (threshold < 1 || threshold > 5) {
                errors.push('alertThreshold must be between 1 and 5');
            }
        }
        return { valid: errors.length === 0, errors };
    }
    async cleanup(context) {
        logger_js_1.default.info({ tenantId: context.tenantId }, 'Alert plugin cleanup');
        this.alerts.clear();
        this.rules.clear();
    }
    async healthCheck() {
        return { healthy: true, message: 'Alert plugin is healthy' };
    }
    // --------------------------------------------------------------------------
    // Action Handlers
    // --------------------------------------------------------------------------
    async createAlert(params, context) {
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: params.type || 'custom',
            severity: params.severity || 3,
            title: params.title || 'Untitled Alert',
            message: params.message || '',
            source: params.source || 'manual',
            timestamp: new Date().toISOString(),
            metadata: params.metadata,
        };
        this.alerts.set(alert.id, alert);
        // Check if we should send notifications
        const threshold = context.config.alertThreshold || 3;
        if (alert.severity >= threshold) {
            await this.sendNotifications(alert, context);
        }
        logger_js_1.default.info({ alertId: alert.id, severity: alert.severity }, 'Alert created');
        return {
            success: true,
            data: alert,
        };
    }
    async listAlerts(params, context) {
        let alerts = Array.from(this.alerts.values());
        // Filter by type
        if (params.type) {
            alerts = alerts.filter((a) => a.type === params.type);
        }
        // Filter by severity
        if (params.minSeverity) {
            alerts = alerts.filter((a) => a.severity >= params.minSeverity);
        }
        // Filter by acknowledged status
        if (params.acknowledged !== undefined) {
            alerts = alerts.filter((a) => a.acknowledged === params.acknowledged);
        }
        // Sort by timestamp descending
        alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Pagination
        const page = params.page || 1;
        const pageSize = params.pageSize || 20;
        const start = (page - 1) * pageSize;
        const paginatedAlerts = alerts.slice(start, start + pageSize);
        return {
            success: true,
            data: {
                alerts: paginatedAlerts,
                total: alerts.length,
                page,
                pageSize,
            },
        };
    }
    async acknowledgeAlert(params, context) {
        const alertId = params.alertId;
        const alert = this.alerts.get(alertId);
        if (!alert) {
            return {
                success: false,
                error: 'Alert not found',
            };
        }
        alert.acknowledged = true;
        alert.acknowledgedBy = context.principal.id;
        alert.acknowledgedAt = new Date().toISOString();
        logger_js_1.default.info({ alertId }, 'Alert acknowledged');
        return {
            success: true,
            data: alert,
        };
    }
    async createRule(params, context) {
        const rule = {
            id: `rule-${Date.now()}`,
            name: params.name || 'Unnamed Rule',
            condition: params.condition,
            actions: params.actions || [],
            enabled: params.enabled !== false,
        };
        this.rules.set(rule.id, rule);
        logger_js_1.default.info({ ruleId: rule.id }, 'Alert rule created');
        return {
            success: true,
            data: rule,
        };
    }
    async listRules(context) {
        return {
            success: true,
            data: Array.from(this.rules.values()),
        };
    }
    async testWebhook(context) {
        const webhookUrl = context.config.webhookUrl;
        if (!webhookUrl) {
            return {
                success: false,
                error: 'No webhook URL configured',
            };
        }
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'test',
                    message: 'Test alert from Summit Platform',
                    timestamp: new Date().toISOString(),
                }),
            });
            return {
                success: response.ok,
                data: { status: response.status },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Webhook test failed: ${error.message}`,
            };
        }
    }
    // --------------------------------------------------------------------------
    // Event Handlers
    // --------------------------------------------------------------------------
    async handleVerdictDenied(payload, context) {
        await this.createAlert({
            type: 'governance',
            severity: 4,
            title: 'Governance Verdict: DENIED',
            message: `Action denied by policy: ${payload.policyId || 'unknown'}`,
            source: 'governance-engine',
            metadata: payload,
        }, context);
    }
    async handleVerdictEscalated(payload, context) {
        await this.createAlert({
            type: 'governance',
            severity: 3,
            title: 'Governance Verdict: ESCALATED',
            message: `Action requires escalation: ${payload.reason || 'Manual review required'}`,
            source: 'governance-engine',
            metadata: payload,
        }, context);
    }
    async handleAlertTriggered(payload, context) {
        // Forward to notification channels
        const alert = payload;
        await this.sendNotifications(alert, context);
    }
    // --------------------------------------------------------------------------
    // Notification Helpers
    // --------------------------------------------------------------------------
    async sendNotifications(alert, context) {
        const config = context.config;
        // Send webhook
        if (config.webhookUrl) {
            try {
                await fetch(config.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(alert),
                });
            }
            catch (error) {
                logger_js_1.default.error({ error }, 'Failed to send webhook notification');
            }
        }
        // Log notification (in production, would send email/Slack)
        if (config.emailRecipients) {
            logger_js_1.default.info({ recipients: config.emailRecipients, alertId: alert.id }, 'Would send email notification');
        }
        if (config.enableSlack && config.slackChannel) {
            logger_js_1.default.info({ channel: config.slackChannel, alertId: alert.id }, 'Would send Slack notification');
        }
    }
}
exports.AlertPlugin = AlertPlugin;
// Export singleton instance
exports.alertPlugin = new AlertPlugin();
exports.default = AlertPlugin;
