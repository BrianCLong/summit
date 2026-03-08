"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRenderer = void 0;
const EventSchema_js_1 = require("../events/EventSchema.js");
const TemplateRegistry_js_1 = require("./TemplateRegistry.js");
class TemplateRenderer {
    registry;
    constructor(registry = new TemplateRegistry_js_1.TemplateRegistry()) {
        this.registry = registry;
    }
    render(event) {
        const template = this.registry.getTemplate(event.type);
        if (!template) {
            return this.renderDefault(event);
        }
        return this.renderWithTemplate(template, event);
    }
    renderDigest(events, recipientId, channel) {
        const severityOrder = [
            EventSchema_js_1.EventSeverity.INFO,
            EventSchema_js_1.EventSeverity.LOW,
            EventSchema_js_1.EventSeverity.MEDIUM,
            EventSchema_js_1.EventSeverity.HIGH,
            EventSchema_js_1.EventSeverity.CRITICAL,
        ];
        const highestSeverity = events.reduce((current, evt) => {
            return severityOrder.indexOf(evt.severity) > severityOrder.indexOf(current)
                ? evt.severity
                : current;
        }, EventSchema_js_1.EventSeverity.INFO);
        const digestEvent = {
            id: `digest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: EventSchema_js_1.EventType.NOTIFICATION_DIGEST,
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
            status: EventSchema_js_1.EventStatus.PENDING,
            timestamp: new Date(),
            title: `You have ${events.length} new notifications`,
            message: events
                .map((evt) => `- [${evt.severity.toUpperCase()}] ${evt.title} (${evt.type})`)
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
    renderWithTemplate(template, event) {
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
    renderDefault(event) {
        return {
            subject: `${event.title}`,
            message: `${event.message}\n\nSeverity: ${event.severity}\nType: ${event.type}`,
            shortMessage: `${event.title}: ${event.message}`,
            callToAction: event.subject.url,
        };
    }
    interpolate(template, event) {
        if (!template)
            return '';
        return template.replace(/{{([^}]+)}}/g, (_, path) => {
            const value = this.getValueByPath(event, path.trim());
            if (value instanceof Date)
                return value.toISOString();
            if (value === undefined || value === null)
                return '';
            return String(value);
        });
    }
    getValueByPath(event, path) {
        return path.split('.').reduce((obj, key) => obj?.[key], event);
    }
}
exports.TemplateRenderer = TemplateRenderer;
