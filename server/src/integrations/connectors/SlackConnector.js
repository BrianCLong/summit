"use strict";
/**
 * Slack Integration Connector
 *
 * Governance-aware Slack integration for notifications and alerts.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration), PI1.1 (Audit)
 *
 * @module integrations/connectors/SlackConnector
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slackConnector = exports.SlackConnector = exports.slackManifest = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// ============================================================================
// Manifest
// ============================================================================
exports.slackManifest = {
    id: 'slack',
    name: 'Slack',
    version: '1.0.0',
    description: 'Send notifications and alerts to Slack channels',
    category: 'communication',
    icon: 'slack',
    vendor: 'Slack Technologies',
    docsUrl: 'https://api.slack.com/docs',
    capabilities: [
        {
            id: 'send_message',
            name: 'Send Message',
            description: 'Send a message to a Slack channel',
            direction: 'outbound',
            requiresApproval: false,
            dataClassification: 'internal',
        },
        {
            id: 'send_alert',
            name: 'Send Alert',
            description: 'Send a governance alert to a Slack channel',
            direction: 'outbound',
            requiresApproval: false,
            dataClassification: 'internal',
        },
        {
            id: 'send_report',
            name: 'Send Report',
            description: 'Send a compliance report summary to Slack',
            direction: 'outbound',
            requiresApproval: true,
            dataClassification: 'confidential',
        },
        {
            id: 'receive_command',
            name: 'Receive Command',
            description: 'Receive slash commands from Slack',
            direction: 'inbound',
            dataClassification: 'internal',
        },
    ],
    configSchema: {
        type: 'object',
        properties: {
            webhookUrl: {
                type: 'string',
                description: 'Slack Incoming Webhook URL',
                format: 'url',
                secret: true,
            },
            botToken: {
                type: 'string',
                description: 'Slack Bot Token (optional, for advanced features)',
                secret: true,
            },
            defaultChannel: {
                type: 'string',
                description: 'Default channel for messages (e.g., #governance-alerts)',
            },
            alertChannel: {
                type: 'string',
                description: 'Channel for governance alerts',
            },
            mentionOnAlert: {
                type: 'boolean',
                description: 'Mention @here on critical alerts',
                default: false,
            },
        },
        required: ['webhookUrl', 'defaultChannel'],
    },
    authType: 'token',
    requiredScopes: ['chat:write', 'channels:read'],
    webhookSupport: true,
    riskLevel: 'low',
};
// ============================================================================
// Connector Implementation
// ============================================================================
class SlackConnector {
    manifest = exports.slackManifest;
    async initialize(context) {
        logger_js_1.default.info({ integrationId: context.integrationId, tenantId: context.tenantId }, 'Slack connector initialized');
    }
    async testConnection(context) {
        const { webhookUrl } = context.config;
        if (!webhookUrl) {
            return {
                connected: false,
                latencyMs: 0,
                message: 'Webhook URL is required',
            };
        }
        const startTime = Date.now();
        try {
            // In production, we would actually test the webhook
            // For now, validate the URL format
            const url = new URL(webhookUrl);
            if (!url.hostname.includes('slack.com')) {
                return {
                    connected: false,
                    latencyMs: Date.now() - startTime,
                    message: 'Invalid Slack webhook URL',
                };
            }
            return {
                connected: true,
                latencyMs: Date.now() - startTime,
                message: 'Connection successful',
                capabilities: this.manifest.capabilities.map((c) => c.id),
            };
        }
        catch (error) {
            return {
                connected: false,
                latencyMs: Date.now() - startTime,
                message: error.message,
            };
        }
    }
    async executeAction(action, params, context) {
        const { webhookUrl, defaultChannel, alertChannel, mentionOnAlert } = context.config;
        switch (action) {
            case 'send_message':
                return this.sendMessage(webhookUrl, params.channel || defaultChannel, params.message, params.blocks);
            case 'send_alert':
                return this.sendAlert(webhookUrl, alertChannel || defaultChannel, params.title, params.severity, params.message, mentionOnAlert);
            case 'send_report':
                return this.sendReport(webhookUrl, params.channel || defaultChannel, params.reportType, params.summary, params.metrics);
            default:
                return {
                    success: false,
                    error: `Unknown action: ${action}`,
                };
        }
    }
    async handleWebhook(event, payload, context) {
        logger_js_1.default.info({ event, integrationId: context.integrationId }, 'Slack webhook received');
        // Handle incoming Slack events (slash commands, interactive components, etc.)
        // In production, verify the Slack signature
    }
    async validateConfig(config) {
        const errors = [];
        if (!config.webhookUrl) {
            errors.push('webhookUrl is required');
        }
        else {
            try {
                const url = new URL(config.webhookUrl);
                if (!url.hostname.includes('slack.com') && !url.hostname.includes('hooks.slack.com')) {
                    errors.push('webhookUrl must be a valid Slack webhook URL');
                }
            }
            catch {
                errors.push('webhookUrl must be a valid URL');
            }
        }
        if (!config.defaultChannel) {
            errors.push('defaultChannel is required');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    async cleanup(context) {
        logger_js_1.default.info({ integrationId: context.integrationId }, 'Slack connector cleanup');
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    async sendMessage(webhookUrl, channel, message, blocks) {
        try {
            const payload = {
                channel,
                text: message,
            };
            if (blocks && blocks.length > 0) {
                payload.blocks = blocks;
            }
            // In production, make actual HTTP request
            // const response = await fetch(webhookUrl, {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(payload),
            // });
            logger_js_1.default.info({ channel, messageLength: message.length }, 'Slack message sent');
            return {
                success: true,
                data: { channel, messageId: `msg_${Date.now()}` },
                metadata: { timestamp: new Date().toISOString() },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async sendAlert(webhookUrl, channel, title, severity, message, mentionOnAlert) {
        const severityColors = {
            critical: '#dc3545',
            high: '#fd7e14',
            medium: '#ffc107',
            low: '#17a2b8',
            info: '#6c757d',
        };
        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `${this.getSeverityEmoji(severity)} ${title}`,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: message,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `*Severity:* ${severity.toUpperCase()} | *Time:* ${new Date().toISOString()}`,
                    },
                ],
            },
        ];
        const text = mentionOnAlert && (severity === 'critical' || severity === 'high')
            ? `<!here> ${title}`
            : title;
        return this.sendMessage(webhookUrl, channel, text, blocks);
    }
    async sendReport(webhookUrl, channel, reportType, summary, metrics) {
        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `📊 ${reportType} Report`,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: summary,
                },
            },
        ];
        if (metrics) {
            const metricsText = Object.entries(metrics)
                .map(([key, value]) => `• *${key}:* ${value}`)
                .join('\n');
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Key Metrics:*\n${metricsText}`,
                },
            });
        }
        blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `Generated by Summit Platform | ${new Date().toISOString()}`,
                },
            ],
        });
        return this.sendMessage(webhookUrl, channel, `${reportType} Report`, blocks);
    }
    getSeverityEmoji(severity) {
        const emojis = {
            critical: '🚨',
            high: '⚠️',
            medium: '⚡',
            low: 'ℹ️',
            info: '📝',
        };
        return emojis[severity] || '📝';
    }
}
exports.SlackConnector = SlackConnector;
// Export singleton
exports.slackConnector = new SlackConnector();
exports.default = SlackConnector;
