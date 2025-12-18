/**
 * Email Delivery Channel
 *
 * Delivers notifications via email using SMTP.
 * Supports HTML templates, plain text fallback, and digest emails.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import type {
  DeliveryResult,
  NotificationMessage,
  NotificationTemplate,
} from '../types.js';
import { BaseDeliveryChannel } from './base-delivery.js';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  auth?: {
    user: string;
    pass: string;
  };
  from: string; // Default from address
  replyTo?: string;
}

export class EmailDelivery extends BaseDeliveryChannel {
  readonly name = 'email' as const;
  readonly enabled: boolean;
  private transporter: Transporter;
  private config: EmailConfig;
  private templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor(config: EmailConfig) {
    super();
    this.config = config;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    this.enabled = true;
    this.registerHandlebarsHelpers();
  }

  async deliver(message: NotificationMessage): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
      // Get recipient email from message destination or data
      const recipientEmail =
        message.destination || message.data.recipientEmail;

      if (!recipientEmail) {
        return {
          success: false,
          channel: 'email',
          error: new Error('No recipient email address'),
          retryable: false,
        };
      }

      // Render email content
      const subject = this.renderSubject(message);
      const html = await this.renderHtml(message);
      const text = this.renderText(message);

      // Send email with retry
      const info = await this.retryWithBackoff(
        () =>
          this.transporter.sendMail({
            from: this.config.from,
            to: recipientEmail,
            replyTo: this.config.replyTo,
            subject: subject,
            html: html,
            text: text,
            headers: {
              'X-Notification-ID': message.id,
              'X-Event-ID': message.eventId,
              'X-Severity': message.severity,
            },
          }),
        3,
        2000
      );

      const durationMs = Date.now() - startTime;
      this.updateStats(
        { success: true, channel: 'email', retryable: false },
        durationMs
      );

      return {
        success: true,
        channel: 'email',
        messageId: info.messageId,
        retryable: false,
        metadata: {
          deliveryTime: durationMs,
          accepted: info.accepted,
          rejected: info.rejected,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const err = error as Error;

      // Determine if error is retryable
      const retryable = this.isRetryableError(err);

      this.updateStats(
        { success: false, channel: 'email', error: err, retryable },
        durationMs
      );

      return {
        success: false,
        channel: 'email',
        error: err,
        retryable,
      };
    }
  }

  /**
   * Render email subject line
   */
  private renderSubject(message: NotificationMessage): string {
    const severityPrefix = this.getSeverityPrefix(message.severity);
    return `${severityPrefix}${message.title}`;
  }

  /**
   * Render HTML email body
   */
  private async renderHtml(message: NotificationMessage): Promise<string> {
    // If template ID is provided, use template
    if (message.templateId) {
      const template = await this.getTemplate(message.templateId);
      if (template) {
        return this.renderTemplate(template, message);
      }
    }

    // Default HTML template
    return this.renderDefaultHtml(message);
  }

  /**
   * Render plain text email body
   */
  private renderText(message: NotificationMessage): string {
    return `
${message.title}

${message.body}

Severity: ${message.severity.toUpperCase()}
Event ID: ${message.eventId}
Notification ID: ${message.id}

---
IntelGraph Audit Notification System
`.trim();
  }

  /**
   * Render default HTML email template
   */
  private renderDefaultHtml(message: NotificationMessage): string {
    const severityColor = this.getSeverityColor(message.severity);
    const severityIcon = this.getSeverityIcon(message.severity);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${message.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <tr>
      <td style="background-color: ${severityColor}; color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${severityIcon} ${message.title}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px;">
        <div style="margin-bottom: 20px;">
          ${message.body.split('\n').map(para => `<p style="margin: 0 0 10px 0;">${para}</p>`).join('')}
        </div>

        ${Object.keys(message.data || {}).length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f5f5f5;">
            <td colspan="2" style="padding: 10px; font-weight: bold;">Event Details</td>
          </tr>
          ${Object.entries(message.data || {}).map(([key, value]) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${this.formatKey(key)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${this.formatValue(value)}</td>
          </tr>
          `).join('')}
        </table>
        ` : ''}

        <div style="margin-top: 20px; text-align: center;">
          <a href="${message.data.baseUrl || 'https://intelgraph.io'}/audit/${message.eventId}"
             style="display: inline-block; padding: 12px 24px; background-color: ${severityColor}; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Full Details
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; background-color: #f5f5f5; border-radius: 0 0 8px 8px; font-size: 12px; color: #666;">
        <p style="margin: 0 0 5px 0;">
          <strong>Notification ID:</strong> ${message.id}<br>
          <strong>Event ID:</strong> ${message.eventId}<br>
          <strong>Severity:</strong> ${message.severity.toUpperCase()}
        </p>
        <p style="margin: 10px 0 0 0;">
          This is an automated notification from the IntelGraph Audit System.
          To manage your notification preferences, visit your account settings.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
  }

  /**
   * Get template from database/cache
   */
  private async getTemplate(
    templateId: string
  ): Promise<NotificationTemplate | null> {
    // TODO: Fetch from database
    // For now, return null to use default template
    return null;
  }

  /**
   * Render Handlebars template
   */
  private renderTemplate(
    template: NotificationTemplate,
    message: NotificationMessage
  ): string {
    const cacheKey = `${template.id}:${template.version}`;

    let compiled = this.templateCache.get(cacheKey);
    if (!compiled && template.html_template) {
      compiled = Handlebars.compile(template.html_template);
      this.templateCache.set(cacheKey, compiled);
    }

    if (!compiled) {
      return this.renderDefaultHtml(message);
    }

    return compiled({
      notification: message,
      event: message.data,
      baseUrl: message.data.baseUrl || 'https://intelgraph.io',
    });
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: string) => {
      return new Date(date).toLocaleString();
    });

    Handlebars.registerHelper('uppercase', (str: string) => {
      return str.toUpperCase();
    });

    Handlebars.registerHelper('json', (obj: any) => {
      return JSON.stringify(obj, null, 2);
    });
  }

  /**
   * Get severity color for styling
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
   * Get severity icon/emoji
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
   * Get severity prefix for subject line
   */
  private getSeverityPrefix(severity: string): string {
    if (severity === 'emergency' || severity === 'critical') {
      return '[URGENT] ';
    }
    if (severity === 'high') {
      return '[IMPORTANT] ';
    }
    return '';
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
   * Format value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
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
      'EAI_AGAIN',
    ];

    return retryableErrors.some((code) => error.message.includes(code));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
