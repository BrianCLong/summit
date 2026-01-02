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

import {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginExecutionResult,
  PluginEvent,
} from '../types/Plugin.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Plugin Manifest
// ============================================================================

export const alertPluginManifest: PluginManifest = {
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
// Alert Types
// ============================================================================

export interface Alert {
  id: string;
  type: 'governance' | 'security' | 'compliance' | 'operational' | 'custom';
  severity: 1 | 2 | 3 | 4 | 5;
  title: string;
  message: string;
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  actions: AlertAction[];
  enabled: boolean;
}

export interface AlertCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'regex';
  value: unknown;
}

export interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'log';
  config: Record<string, unknown>;
}

// ============================================================================
// Plugin Implementation
// ============================================================================

export class AlertPlugin implements Plugin {
  manifest = alertPluginManifest;
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();

  async initialize(context: PluginContext): Promise<void> {
    logger.info({ tenantId: context.tenantId }, 'Alert plugin initialized');
  }

  async execute(
    action: string,
    params: Record<string, unknown>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
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

  async onEvent(
    event: PluginEvent,
    payload: Record<string, unknown>,
    context: PluginContext
  ): Promise<void> {
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

  async validateConfig(config: Record<string, unknown>): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (config.webhookUrl && typeof config.webhookUrl !== 'string') {
      errors.push('webhookUrl must be a string');
    }

    if (config.emailRecipients && !Array.isArray(config.emailRecipients)) {
      errors.push('emailRecipients must be an array');
    }

    if (config.alertThreshold !== undefined) {
      const threshold = config.alertThreshold as number;
      if (threshold < 1 || threshold > 5) {
        errors.push('alertThreshold must be between 1 and 5');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async cleanup(context: PluginContext): Promise<void> {
    logger.info({ tenantId: context.tenantId }, 'Alert plugin cleanup');
    this.alerts.clear();
    this.rules.clear();
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    return { healthy: true, message: 'Alert plugin is healthy' };
  }

  // --------------------------------------------------------------------------
  // Action Handlers
  // --------------------------------------------------------------------------

  private async createAlert(
    params: Record<string, unknown>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: (params.type as Alert['type']) || 'custom',
      severity: (params.severity as Alert['severity']) || 3,
      title: params.title as string || 'Untitled Alert',
      message: params.message as string || '',
      source: params.source as string || 'manual',
      timestamp: new Date().toISOString(),
      metadata: params.metadata as Record<string, unknown>,
    };

    this.alerts.set(alert.id, alert);

    // Check if we should send notifications
    const threshold = (context.config.alertThreshold as number) || 3;
    if (alert.severity >= threshold) {
      await this.sendNotifications(alert, context);
    }

    logger.info({ alertId: alert.id, severity: alert.severity }, 'Alert created');

    return {
      success: true,
      data: alert,
    };
  }

  private async listAlerts(
    params: Record<string, unknown>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    let alerts = Array.from(this.alerts.values());

    // Filter by type
    if (params.type) {
      alerts = alerts.filter((a) => a.type === params.type);
    }

    // Filter by severity
    if (params.minSeverity) {
      alerts = alerts.filter((a) => a.severity >= (params.minSeverity as number));
    }

    // Filter by acknowledged status
    if (params.acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === params.acknowledged);
    }

    // Sort by timestamp descending
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Pagination
    const page = (params.page as number) || 1;
    const pageSize = (params.pageSize as number) || 20;
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

  private async acknowledgeAlert(
    params: Record<string, unknown>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    const alertId = params.alertId as string;
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

    logger.info({ alertId }, 'Alert acknowledged');

    return {
      success: true,
      data: alert,
    };
  }

  private async createRule(
    params: Record<string, unknown>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    const rule: AlertRule = {
      id: `rule-${Date.now()}`,
      name: params.name as string || 'Unnamed Rule',
      condition: params.condition as AlertCondition,
      actions: params.actions as AlertAction[] || [],
      enabled: params.enabled !== false,
    };

    this.rules.set(rule.id, rule);

    logger.info({ ruleId: rule.id }, 'Alert rule created');

    return {
      success: true,
      data: rule,
    };
  }

  private async listRules(context: PluginContext): Promise<PluginExecutionResult> {
    return {
      success: true,
      data: Array.from(this.rules.values()),
    };
  }

  private async testWebhook(context: PluginContext): Promise<PluginExecutionResult> {
    const webhookUrl = context.config.webhookUrl as string;
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
    } catch (error: any) {
      return {
        success: false,
        error: `Webhook test failed: ${error.message}`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  private async handleVerdictDenied(
    payload: Record<string, unknown>,
    context: PluginContext
  ): Promise<void> {
    await this.createAlert(
      {
        type: 'governance',
        severity: 4,
        title: 'Governance Verdict: DENIED',
        message: `Action denied by policy: ${payload.policyId || 'unknown'}`,
        source: 'governance-engine',
        metadata: payload,
      },
      context
    );
  }

  private async handleVerdictEscalated(
    payload: Record<string, unknown>,
    context: PluginContext
  ): Promise<void> {
    await this.createAlert(
      {
        type: 'governance',
        severity: 3,
        title: 'Governance Verdict: ESCALATED',
        message: `Action requires escalation: ${payload.reason || 'Manual review required'}`,
        source: 'governance-engine',
        metadata: payload,
      },
      context
    );
  }

  private async handleAlertTriggered(
    payload: Record<string, unknown>,
    context: PluginContext
  ): Promise<void> {
    // Forward to notification channels
    const alert = payload as Alert;
    await this.sendNotifications(alert, context);
  }

  // --------------------------------------------------------------------------
  // Notification Helpers
  // --------------------------------------------------------------------------

  private async sendNotifications(alert: Alert, context: PluginContext): Promise<void> {
    const config = context.config;

    // Send webhook
    if (config.webhookUrl) {
      try {
        await fetch(config.webhookUrl as string, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
      } catch (error: any) {
        logger.error({ error }, 'Failed to send webhook notification');
      }
    }

    // Log notification (in production, would send email/Slack)
    if (config.emailRecipients) {
      logger.info(
        { recipients: config.emailRecipients, alertId: alert.id },
        'Would send email notification'
      );
    }

    if (config.enableSlack && config.slackChannel) {
      logger.info(
        { channel: config.slackChannel, alertId: alert.id },
        'Would send Slack notification'
      );
    }
  }
}

// Export singleton instance
export const alertPlugin = new AlertPlugin();
export default AlertPlugin;
