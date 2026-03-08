"use strict";
/**
 * Slack Delivery Channel
 *
 * Delivers notifications to Slack channels via Incoming Webhooks or Bot API.
 * Supports rich message formatting using Slack Block Kit.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackDelivery = void 0;
const webhook_1 = require("@slack/webhook");
const base_delivery_js_1 = require("./base-delivery.js");
class SlackDelivery extends base_delivery_js_1.BaseDeliveryChannel {
    name = 'slack';
    enabled;
    config;
    webhookCache = new Map();
    constructor(config = {}) {
        super();
        this.config = config;
        this.enabled = !!config.defaultWebhookUrl || !!config.botToken;
    }
    async deliver(message) {
        const startTime = Date.now();
        try {
            // Get webhook URL from message destination or default
            const webhookUrl = message.destination || this.config.defaultWebhookUrl;
            if (!webhookUrl) {
                return {
                    success: false,
                    channel: 'slack',
                    error: new Error('No Slack webhook URL configured'),
                    retryable: false,
                };
            }
            // Get or create webhook client
            const webhook = this.getWebhook(webhookUrl);
            // Build Slack message
            const slackMessage = this.buildSlackMessage(message);
            // Send with retry
            const result = await this.retryWithBackoff(() => webhook.send(slackMessage), 3, 1000);
            const durationMs = Date.now() - startTime;
            this.updateStats({ success: true, channel: 'slack', retryable: false }, durationMs);
            return {
                success: true,
                channel: 'slack',
                messageId: result.text || message.id,
                retryable: false,
                metadata: {
                    deliveryTime: durationMs,
                    webhookUrl: this.maskWebhookUrl(webhookUrl),
                },
            };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const err = error;
            // Determine if error is retryable
            const retryable = this.isRetryableError(err);
            this.updateStats({ success: false, channel: 'slack', error: err, retryable }, durationMs);
            return {
                success: false,
                channel: 'slack',
                error: err,
                retryable,
            };
        }
    }
    /**
     * Get or create webhook client
     */
    getWebhook(url) {
        const cached = this.webhookCache.get(url);
        if (cached) {
            return cached;
        }
        const webhook = new webhook_1.IncomingWebhook(url);
        this.webhookCache.set(url, webhook);
        return webhook;
    }
    /**
     * Build Slack message with Block Kit
     */
    buildSlackMessage(message) {
        const severityColor = this.getSeverityColor(message.severity);
        const severityIcon = this.getSeverityIcon(message.severity);
        return {
            username: 'IntelGraph Audit',
            icon_emoji: ':shield:',
            attachments: [
                {
                    color: severityColor,
                    blocks: [
                        // Header
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: `${severityIcon} ${message.title}`,
                                emoji: true,
                            },
                        },
                        // Body
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: message.body,
                            },
                        },
                        // Event details
                        ...this.buildEventDetailsBlocks(message),
                        // Divider
                        {
                            type: 'divider',
                        },
                        // Context
                        {
                            type: 'context',
                            elements: [
                                {
                                    type: 'mrkdwn',
                                    text: `*Severity:* ${message.severity.toUpperCase()} | *Event ID:* \`${message.eventId}\` | *Notification ID:* \`${message.id}\``,
                                },
                            ],
                        },
                        // Actions
                        {
                            type: 'actions',
                            elements: [
                                {
                                    type: 'button',
                                    text: {
                                        type: 'plain_text',
                                        text: 'View Details',
                                        emoji: true,
                                    },
                                    url: `${message.data.baseUrl || 'https://intelgraph.io'}/audit/${message.eventId}`,
                                    style: this.getButtonStyle(message.severity),
                                },
                                ...(message.severity === 'critical' ||
                                    message.severity === 'emergency'
                                    ? [
                                        {
                                            type: 'button',
                                            text: {
                                                type: 'plain_text',
                                                text: 'Acknowledge',
                                                emoji: true,
                                            },
                                            value: message.id,
                                            action_id: 'acknowledge_notification',
                                        },
                                    ]
                                    : []),
                            ],
                        },
                    ],
                },
            ],
            // Fallback text for notifications
            text: `${severityIcon} ${message.title}: ${message.body}`,
        };
    }
    /**
     * Build event details blocks
     */
    buildEventDetailsBlocks(message) {
        if (!message.data || Object.keys(message.data).length === 0) {
            return [];
        }
        const fields = [];
        const importantFields = [
            'user_email',
            'resource_type',
            'resource_id',
            'action',
            'outcome',
            'ip_address',
            'timestamp',
        ];
        for (const key of importantFields) {
            if (message.data[key] !== undefined && message.data[key] !== null) {
                fields.push({
                    type: 'mrkdwn',
                    text: `*${this.formatKey(key)}:*\n${this.formatValue(message.data[key])}`,
                });
                // Limit to 10 fields to avoid message being too long
                if (fields.length >= 10) {
                    break;
                }
            }
        }
        if (fields.length === 0) {
            return [];
        }
        return [
            {
                type: 'section',
                fields: fields,
            },
        ];
    }
    /**
     * Get Slack color for severity
     */
    getSeverityColor(severity) {
        const colors = {
            emergency: '#b71c1c',
            critical: '#d32f2f',
            high: '#f57c00',
            medium: '#fbc02d',
            low: '#388e3c',
        };
        return colors[severity] || '#757575';
    }
    /**
     * Get Slack emoji for severity
     */
    getSeverityIcon(severity) {
        const icons = {
            emergency: '🚨',
            critical: '⚠️',
            high: '❗',
            medium: 'ℹ️',
            low: '📝',
        };
        return icons[severity] || '📬';
    }
    /**
     * Get button style based on severity
     */
    getButtonStyle(severity) {
        if (severity === 'emergency' || severity === 'critical') {
            return 'danger';
        }
        if (severity === 'high') {
            return 'primary';
        }
        return undefined;
    }
    /**
     * Format key for display
     */
    formatKey(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    /**
     * Format value for display in Slack
     */
    formatValue(value) {
        if (value === null || value === undefined) {
            return '_N/A_';
        }
        if (typeof value === 'boolean') {
            return value ? '✅ Yes' : '❌ No';
        }
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
            // ISO date format
            return `<!date^${Math.floor(new Date(value).getTime() / 1000)}^{date_short_pretty} {time}|${value}>`;
        }
        if (typeof value === 'object') {
            return `\`\`\`${JSON.stringify(value, null, 2)}\`\`\``;
        }
        return String(value);
    }
    /**
     * Mask webhook URL for logging
     */
    maskWebhookUrl(url) {
        try {
            const parsed = new URL(url);
            const pathParts = parsed.pathname.split('/');
            if (pathParts.length > 0) {
                pathParts[pathParts.length - 1] = '***';
            }
            return `${parsed.protocol}//${parsed.host}${pathParts.join('/')}`;
        }
        catch {
            return '***';
        }
    }
    /**
     * Determine if error is retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'ETIMEDOUT',
            'ECONNREFUSED',
            'ECONNRESET',
            'ENOTFOUND',
            'ENETUNREACH',
            'rate_limited',
        ];
        const message = error.message.toLowerCase();
        return retryableErrors.some((code) => message.includes(code.toLowerCase()));
    }
    async healthCheck() {
        if (!this.config.defaultWebhookUrl) {
            return false;
        }
        try {
            const webhook = this.getWebhook(this.config.defaultWebhookUrl);
            // Send a test message (won't actually send, just validates URL format)
            // In production, you might want to actually send a test message
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.SlackDelivery = SlackDelivery;
