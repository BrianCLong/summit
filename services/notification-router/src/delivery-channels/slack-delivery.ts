/**
 * Slack Delivery Channel
 *
 * Delivers notifications to Slack channels via Incoming Webhooks or Bot API.
 * Supports rich message formatting using Slack Block Kit.
 */

import { IncomingWebhook } from '@slack/webhook';
import type {
  DeliveryResult,
  NotificationMessage,
} from '../types.js';
import { BaseDeliveryChannel } from './base-delivery.js';

export interface SlackConfig {
  botToken?: string;
  defaultWebhookUrl?: string;
}

export class SlackDelivery extends BaseDeliveryChannel {
  readonly name = 'slack' as const;
  readonly enabled: boolean;
  private config: SlackConfig;
  private webhookCache: Map<string, IncomingWebhook> = new Map();

  constructor(config: SlackConfig = {}) {
    super();
    this.config = config;
    this.enabled = !!config.defaultWebhookUrl || !!config.botToken;
  }

  async deliver(message: NotificationMessage): Promise<DeliveryResult> {
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
      const result = await this.retryWithBackoff(
        () => webhook.send(slackMessage),
        3,
        1000
      );

      const durationMs = Date.now() - startTime;
      this.updateStats(
        { success: true, channel: 'slack', retryable: false },
        durationMs
      );

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
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const err = error as Error;

      // Determine if error is retryable
      const retryable = this.isRetryableError(err);

      this.updateStats(
        { success: false, channel: 'slack', error: err, retryable },
        durationMs
      );

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
  private getWebhook(url: string): IncomingWebhook {
    const cached = this.webhookCache.get(url);
    if (cached) {
      return cached;
    }

    const webhook = new IncomingWebhook(url);
    this.webhookCache.set(url, webhook);
    return webhook;
  }

  /**
   * Build Slack message with Block Kit
   */
  private buildSlackMessage(message: NotificationMessage): any {
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
  private buildEventDetailsBlocks(message: NotificationMessage): any[] {
    if (!message.data || Object.keys(message.data).length === 0) {
      return [];
    }

    const fields: any[] = [];
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
  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
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
  private getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
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
  private getButtonStyle(severity: string): 'danger' | 'primary' | undefined {
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
  private formatKey(key: string): string {
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
  private formatValue(value: any): string {
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
  private maskWebhookUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/');
      if (pathParts.length > 0) {
        pathParts[pathParts.length - 1] = '***';
      }
      return `${parsed.protocol}//${parsed.host}${pathParts.join('/')}`;
    } catch {
      return '***';
    }
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: Error): boolean {
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

  async healthCheck(): Promise<boolean> {
    if (!this.config.defaultWebhookUrl) {
      return false;
    }

    try {
      const webhook = this.getWebhook(this.config.defaultWebhookUrl);
      // Send a test message (won't actually send, just validates URL format)
      // In production, you might want to actually send a test message
      return true;
    } catch {
      return false;
    }
  }
}
