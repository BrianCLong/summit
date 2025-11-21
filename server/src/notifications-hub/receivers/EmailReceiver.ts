/**
 * Email Receiver for sending email notifications
 *
 * Integrates with SMTP or email service providers to deliver notifications via email.
 * Supports templating, HTML/text content, and attachments.
 */

import {
  BaseReceiver,
  DeliveryResult,
  ReceiverConfig,
} from './ReceiverInterface.js';
import { CanonicalEvent, EventSeverity } from '../events/EventSchema.js';

export interface EmailReceiverConfig extends ReceiverConfig {
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    email: string;
  };
  replyTo?: string;
  templatePath?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  metadata?: Record<string, unknown>;
}

export class EmailReceiver extends BaseReceiver {
  private emailConfig: EmailReceiverConfig;

  constructor() {
    super('email', 'Email Notifications');
  }

  protected async onInitialize(): Promise<void> {
    this.emailConfig = this.config as EmailReceiverConfig;

    // Validate configuration
    if (!this.emailConfig.from?.email) {
      throw new Error('Email receiver requires "from.email" configuration');
    }

    // In production, this would initialize SMTP connection or email service client
    // For now, we'll use a mock implementation
  }

  protected async deliverToRecipient(
    event: CanonicalEvent,
    recipient: string,
    options?: Record<string, unknown>,
  ): Promise<DeliveryResult> {
    try {
      const emailMessage = this.buildEmailMessage(event, recipient, options);

      // Send email (mock implementation - replace with actual email service)
      const messageId = await this.sendEmail(emailMessage);

      return {
        success: true,
        recipientId: recipient,
        channel: this.id,
        messageId,
        deliveredAt: new Date(),
        metadata: {
          subject: emailMessage.subject,
        },
      };
    } catch (error) {
      return {
        success: false,
        recipientId: recipient,
        channel: this.id,
        error: error as Error,
      };
    }
  }

  private buildEmailMessage(
    event: CanonicalEvent,
    recipient: string,
    options?: Record<string, unknown>,
  ): EmailMessage {
    const subject = this.buildSubject(event);
    const text = this.buildTextContent(event);
    const html = this.buildHtmlContent(event);

    return {
      to: recipient,
      subject,
      text,
      html,
      metadata: {
        eventId: event.id,
        eventType: event.type,
        severity: event.severity,
      },
    };
  }

  private buildSubject(event: CanonicalEvent): string {
    const severityPrefix = this.getSeverityPrefix(event.severity);
    return `${severityPrefix}${event.title}`;
  }

  private getSeverityPrefix(severity: EventSeverity): string {
    const prefixes = {
      [EventSeverity.CRITICAL]: '[CRITICAL] ',
      [EventSeverity.HIGH]: '[HIGH] ',
      [EventSeverity.MEDIUM]: '',
      [EventSeverity.LOW]: '',
      [EventSeverity.INFO]: '[INFO] ',
    };
    return prefixes[severity] || '';
  }

  private buildTextContent(event: CanonicalEvent): string {
    let text = `${event.title}\n\n`;
    text += `${event.message}\n\n`;
    text += `---\n`;
    text += `Event ID: ${event.id}\n`;
    text += `Severity: ${event.severity}\n`;
    text += `Type: ${event.type}\n`;
    text += `Actor: ${event.actor.name} (${event.actor.type})\n`;
    text += `Subject: ${event.subject.name || event.subject.id} (${event.subject.type})\n`;
    text += `Timestamp: ${event.timestamp.toISOString()}\n`;

    if (event.subject.url) {
      text += `\nView details: ${event.subject.url}\n`;
    }

    if (event.metadata?.links && Array.isArray(event.metadata.links)) {
      text += `\nRelated links:\n`;
      event.metadata.links.forEach((link: any) => {
        text += `- ${link.title || link.rel}: ${link.href}\n`;
      });
    }

    text += `\n---\n`;
    text += `Tenant: ${event.context.tenantId}\n`;
    if (event.context.projectId) {
      text += `Project: ${event.context.projectId}\n`;
    }
    if (event.context.environment) {
      text += `Environment: ${event.context.environment}\n`;
    }

    return text;
  }

  private buildHtmlContent(event: CanonicalEvent): string {
    const severityColor = this.getSeverityColor(event.severity);
    const severityBadge = this.getSeverityBadge(event.severity);

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .footer { background: #f0f0f0; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
    .button { display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
    .metadata { font-size: 12px; color: #666; margin-top: 20px; }
    .metadata-item { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge" style="background: rgba(255,255,255,0.2);">${severityBadge}</div>
      <h2 style="margin: 10px 0 0 0;">${this.escapeHtml(event.title)}</h2>
    </div>
    <div class="content">
      <p>${this.escapeHtml(event.message)}</p>

      ${event.subject.url ? `<p><a href="${event.subject.url}" class="button">View Details</a></p>` : ''}

      ${this.buildLinksHtml(event)}

      <div class="metadata">
        <div class="metadata-item"><strong>Event ID:</strong> ${event.id}</div>
        <div class="metadata-item"><strong>Type:</strong> ${event.type}</div>
        <div class="metadata-item"><strong>Actor:</strong> ${this.escapeHtml(event.actor.name)} (${event.actor.type})</div>
        <div class="metadata-item"><strong>Subject:</strong> ${this.escapeHtml(event.subject.name || event.subject.id)} (${event.subject.type})</div>
        <div class="metadata-item"><strong>Timestamp:</strong> ${event.timestamp.toISOString()}</div>
      </div>
    </div>
    <div class="footer">
      <p>Tenant: ${event.context.tenantId}${event.context.projectId ? ` | Project: ${event.context.projectId}` : ''}${event.context.environment ? ` | Environment: ${event.context.environment}` : ''}</p>
      <p>This is an automated notification from Summit. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return html.trim();
  }

  private buildLinksHtml(event: CanonicalEvent): string {
    if (!event.metadata?.links || !Array.isArray(event.metadata.links)) {
      return '';
    }

    let html = '<div style="margin-top: 20px;"><strong>Related Links:</strong><ul>';
    event.metadata.links.forEach((link: any) => {
      html += `<li><a href="${link.href}">${this.escapeHtml(link.title || link.rel)}</a></li>`;
    });
    html += '</ul></div>';

    return html;
  }

  private getSeverityColor(severity: EventSeverity): string {
    const colors = {
      [EventSeverity.CRITICAL]: '#dc3545',
      [EventSeverity.HIGH]: '#fd7e14',
      [EventSeverity.MEDIUM]: '#ffc107',
      [EventSeverity.LOW]: '#28a745',
      [EventSeverity.INFO]: '#17a2b8',
    };
    return colors[severity] || '#6c757d';
  }

  private getSeverityBadge(severity: EventSeverity): string {
    return severity.toUpperCase();
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  private async sendEmail(message: EmailMessage): Promise<string> {
    // Mock implementation - replace with actual email service
    // In production, this would use nodemailer, SendGrid, AWS SES, etc.

    return await this.retryWithBackoff(async () => {
      // Simulate email sending
      await this.sleep(100 + Math.random() * 200);

      // Simulate occasional failures
      if (Math.random() < 0.05) {
        throw new Error('SMTP connection timeout');
      }

      // Return mock message ID
      return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, 'Email delivery');
  }

  async validateRecipient(recipient: string): Promise<boolean> {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(recipient);
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // In production, verify SMTP connection or email service API
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async onShutdown(): Promise<void> {
    // Close SMTP connection or cleanup resources
  }
}
