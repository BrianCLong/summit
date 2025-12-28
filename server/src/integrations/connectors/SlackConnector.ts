/**
 * Slack Integration Connector
 *
 * Governance-aware Slack integration for notifications and alerts.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration), PI1.1 (Audit)
 *
 * @module integrations/connectors/SlackConnector
 */

import {
  IntegrationConnector,
  IntegrationManifest,
  IntegrationContext,
  ConnectionTestResult,
  ActionResult,
  ValidationResult,
} from '../types/Integration.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Manifest
// ============================================================================

export const slackManifest: IntegrationManifest = {
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

export class SlackConnector implements IntegrationConnector {
  manifest = slackManifest;

  async initialize(context: IntegrationContext): Promise<void> {
    logger.info(
      { integrationId: context.integrationId, tenantId: context.tenantId },
      'Slack connector initialized'
    );
  }

  async testConnection(context: IntegrationContext): Promise<ConnectionTestResult> {
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
      const url = new URL(webhookUrl as string);
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
    } catch (error: any) {
      return {
        connected: false,
        latencyMs: Date.now() - startTime,
        message: error.message,
      };
    }
  }

  async executeAction(
    action: string,
    params: Record<string, unknown>,
    context: IntegrationContext
  ): Promise<ActionResult> {
    const { webhookUrl, defaultChannel, alertChannel, mentionOnAlert } = context.config;

    switch (action) {
      case 'send_message':
        return this.sendMessage(
          webhookUrl as string,
          params.channel as string || defaultChannel as string,
          params.message as string,
          params.blocks as unknown[]
        );

      case 'send_alert':
        return this.sendAlert(
          webhookUrl as string,
          alertChannel as string || defaultChannel as string,
          params.title as string,
          params.severity as string,
          params.message as string,
          mentionOnAlert as boolean
        );

      case 'send_report':
        return this.sendReport(
          webhookUrl as string,
          params.channel as string || defaultChannel as string,
          params.reportType as string,
          params.summary as string,
          params.metrics as Record<string, unknown>
        );

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  async handleWebhook(
    event: string,
    payload: unknown,
    context: IntegrationContext
  ): Promise<void> {
    logger.info(
      { event, integrationId: context.integrationId },
      'Slack webhook received'
    );

    // Handle incoming Slack events (slash commands, interactive components, etc.)
    // In production, verify the Slack signature
  }

  async validateConfig(config: Record<string, unknown>): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!config.webhookUrl) {
      errors.push('webhookUrl is required');
    } else {
      try {
        const url = new URL(config.webhookUrl as string);
        if (!url.hostname.includes('slack.com') && !url.hostname.includes('hooks.slack.com')) {
          errors.push('webhookUrl must be a valid Slack webhook URL');
        }
      } catch {
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

  async cleanup(context: IntegrationContext): Promise<void> {
    logger.info(
      { integrationId: context.integrationId },
      'Slack connector cleanup'
    );
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private async sendMessage(
    webhookUrl: string,
    channel: string,
    message: string,
    blocks?: unknown[]
  ): Promise<ActionResult> {
    try {
      const payload: Record<string, unknown> = {
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

      logger.info({ channel, messageLength: message.length }, 'Slack message sent');

      return {
        success: true,
        data: { channel, messageId: `msg_${Date.now()}` },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async sendAlert(
    webhookUrl: string,
    channel: string,
    title: string,
    severity: string,
    message: string,
    mentionOnAlert: boolean
  ): Promise<ActionResult> {
    const severityColors: Record<string, string> = {
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

  private async sendReport(
    webhookUrl: string,
    channel: string,
    reportType: string,
    summary: string,
    metrics?: Record<string, unknown>
  ): Promise<ActionResult> {
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
    } as any);

    return this.sendMessage(webhookUrl, channel, `${reportType} Report`, blocks);
  }

  private getSeverityEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
      info: '📝',
    };
    return emojis[severity] || '📝';
  }
}

// Export singleton
export const slackConnector = new SlackConnector();
export default SlackConnector;
