import {
  CanonicalEvent,
  EventSeverity,
  EventType,
  EventStatus,
} from '../events/EventSchema.js';
import { TemplateRegistry, MessageTemplate } from './TemplateRegistry.js';

export interface RenderedTemplate {
  subject: string;
  message: string;
  shortMessage: string;
  callToAction?: string;
  templateId?: string;
}

export class TemplateRenderer {
  constructor(private readonly registry = new TemplateRegistry()) {}

  render(event: CanonicalEvent): RenderedTemplate {
    const template = this.registry.getTemplate(event.type);
    if (!template) {
      return this.renderDefault(event);
    }

    return this.renderWithTemplate(template, event);
  }

  renderDigest(
    events: CanonicalEvent[],
    recipientId: string,
    channel: string,
  ): { event: CanonicalEvent; template: RenderedTemplate } {
    const severityOrder = [
      EventSeverity.INFO,
      EventSeverity.LOW,
      EventSeverity.MEDIUM,
      EventSeverity.HIGH,
      EventSeverity.CRITICAL,
    ];

    const highestSeverity = events.reduce((current, evt) => {
      return severityOrder.indexOf(evt.severity) > severityOrder.indexOf(current)
        ? evt.severity
        : current;
    }, EventSeverity.INFO);

    const digestEvent: CanonicalEvent = {
      id: `digest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: EventType.NOTIFICATION_DIGEST,
      version: '1.0.0',
      actor: {
        id: 'notification-hub',
        type: 'system',
        name: 'Notification Hub',
      },
      subject: {
        type: 'digest',
        id: recipientId,
        name: `Digest for ${recipientId}`,
      },
      context: events[0]?.context || { tenantId: 'default' },
      severity: highestSeverity,
      status: EventStatus.PENDING,
      timestamp: new Date(),
      title: `You have ${events.length} new notifications`,
      message: events
        .map(
          (evt) =>
            `- [${evt.severity.toUpperCase()}] ${evt.title} (${evt.type})`,
        )
        .join('\n'),
      payload: {
        channel,
        events: events.map((evt) => ({
          id: evt.id,
          type: evt.type,
          title: evt.title,
          severity: evt.severity,
          timestamp: evt.timestamp,
        })),
      },
      metadata: {
        source: 'digest',
      },
    };

    const template = this.render(digestEvent);
    return { event: digestEvent, template };
  }

  private renderWithTemplate(
    template: MessageTemplate,
    event: CanonicalEvent,
  ): RenderedTemplate {
    const subject = this.interpolate(template.title, event);
    const message = this.interpolate(template.message, event);
    const shortMessage = this.interpolate(template.shortMessage, event);

    return {
      subject,
      message,
      shortMessage,
      callToAction: template.callToAction,
      templateId: template.id,
    };
  }

  private renderDefault(event: CanonicalEvent): RenderedTemplate {
    return {
      subject: `${event.title}`,
      message: `${event.message}\n\nSeverity: ${event.severity}\nType: ${event.type}`,
      shortMessage: `${event.title}: ${event.message}`,
      callToAction: event.subject.url,
    };
  }

  private interpolate(template: string, event: CanonicalEvent): string {
    if (!template) return '';
    return template.replace(/{{([^}]+)}}/g, (_, path) => {
      const value = this.getValueByPath(event, path.trim());
      if (value instanceof Date) return value.toISOString();
      if (value === undefined || value === null) return '';
      return String(value);
    });
  }

  private getValueByPath(event: CanonicalEvent, path: string): unknown {
    return path.split('.').reduce((obj: any, key) => obj?.[key], event);
  }
}
