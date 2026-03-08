"use strict";
/**
 * Webhook Receiver for custom integrations
 *
 * Sends event notifications to arbitrary HTTP endpoints, enabling
 * integration with any system that can receive webhooks.
 *
 * Features:
 * - Configurable HTTP methods (POST, PUT, PATCH)
 * - Custom headers and authentication
 * - Payload transformation
 * - Signature verification for security
 * - Retry with exponential backoff
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookTransforms = exports.WebhookValidator = exports.WebhookReceiver = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ReceiverInterface_js_1 = require("./ReceiverInterface.js");
class WebhookReceiver extends ReceiverInterface_js_1.BaseReceiver {
    webhookConfig;
    constructor() {
        super('webhook', 'Webhook Notifications');
    }
    async onInitialize() {
        this.webhookConfig = this.config;
        // Set defaults
        if (!this.webhookConfig.method) {
            this.webhookConfig.method = 'POST';
        }
        if (!this.webhookConfig.timeout) {
            this.webhookConfig.timeout = 30000; // 30 seconds
        }
        if (!this.webhookConfig.payloadTransform) {
            this.webhookConfig.payloadTransform = 'full';
        }
    }
    async deliverToRecipient(event, recipient, options) {
        try {
            const url = recipient;
            const payload = this.buildPayload(event);
            const headers = this.buildHeaders(payload);
            const messageId = await this.sendWebhook(url, payload, headers);
            return {
                success: true,
                recipientId: recipient,
                channel: this.id,
                messageId,
                deliveredAt: new Date(),
                metadata: {
                    url,
                    method: this.webhookConfig.method,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                recipientId: recipient,
                channel: this.id,
                error: error,
            };
        }
    }
    buildPayload(event) {
        const timestamp = new Date().toISOString();
        let transformedEvent = event;
        // Apply payload transformation
        if (this.webhookConfig.payloadTransform === 'minimal') {
            transformedEvent = this.buildMinimalPayload(event);
        }
        else if (this.webhookConfig.payloadTransform === 'custom' &&
            this.webhookConfig.customTransform) {
            transformedEvent = this.webhookConfig.customTransform(event);
        }
        const payload = {
            event: transformedEvent,
            timestamp,
            version: '1.0.0',
        };
        // Add signature if secret is configured
        if (this.webhookConfig.signatureSecret) {
            payload.signature = this.generateSignature(payload);
        }
        return payload;
    }
    buildMinimalPayload(event) {
        return {
            id: event.id,
            type: event.type,
            severity: event.severity,
            title: event.title,
            message: event.message,
            timestamp: event.timestamp,
            actor: {
                id: event.actor.id,
                type: event.actor.type,
                name: event.actor.name,
            },
            subject: {
                type: event.subject.type,
                id: event.subject.id,
                url: event.subject.url,
            },
            context: {
                tenantId: event.context.tenantId,
                projectId: event.context.projectId,
                environment: event.context.environment,
            },
        };
    }
    generateSignature(payload) {
        const secret = this.webhookConfig.signatureSecret;
        const data = JSON.stringify({
            event: payload.event,
            timestamp: payload.timestamp,
        });
        return crypto_1.default
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex');
    }
    buildHeaders(payload) {
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Summit-Notifications-Hub/1.0',
            'X-Summit-Event-Type': payload.event.type,
            'X-Summit-Event-Id': payload.event.id,
            'X-Summit-Timestamp': payload.timestamp,
            ...(this.webhookConfig.headers || {}),
        };
        // Add signature header
        if (payload.signature) {
            headers['X-Summit-Signature'] = payload.signature;
        }
        // Add authentication
        if (this.webhookConfig.auth) {
            this.addAuthHeader(headers, this.webhookConfig.auth);
        }
        return headers;
    }
    addAuthHeader(headers, auth) {
        switch (auth.type) {
            case 'basic':
                const basicAuth = Buffer.from(`${auth.credentials.username}:${auth.credentials.password}`).toString('base64');
                headers['Authorization'] = `Basic ${basicAuth}`;
                break;
            case 'bearer':
                headers['Authorization'] = `Bearer ${auth.credentials.token}`;
                break;
            case 'apikey':
                const keyHeader = auth.credentials.header || 'X-API-Key';
                headers[keyHeader] = auth.credentials.key;
                break;
            case 'hmac':
                // HMAC is already handled in signature
                break;
        }
    }
    async sendWebhook(url, payload, headers) {
        const simulate = this.webhookConfig.simulation?.enabled ?? true;
        const failureRate = this.webhookConfig.simulation?.transientFailureRate ?? 0.08;
        const httpErrorRate = this.webhookConfig.simulation?.httpErrorRate ?? 0.05;
        const minLatency = this.webhookConfig.simulation?.minLatencyMs ?? 100;
        const maxLatency = this.webhookConfig.simulation?.maxLatencyMs ?? 400;
        return await this.retryWithBackoff(async () => {
            // Mock implementation - replace with actual HTTP client (axios, fetch, etc.)
            if (simulate) {
                await this.sleep(minLatency + Math.random() * Math.max(0, maxLatency - minLatency));
                // Simulate occasional failures
                if (Math.random() < failureRate) {
                    throw new Error('Webhook endpoint timeout');
                }
                // Simulate HTTP errors
                if (Math.random() < httpErrorRate) {
                    throw new Error('Webhook endpoint returned 500 Internal Server Error');
                }
            }
            // Return mock message ID
            return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            /* Production implementation would be:
            const response = await fetch(url, {
              method: this.webhookConfig.method,
              headers,
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(this.webhookConfig.timeout!),
            });
      
            if (!response.ok) {
              throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
            }
      
            return response.headers.get('X-Request-ID') || `webhook_${Date.now()}`;
            */
        }, 'Webhook delivery');
    }
    async validateRecipient(recipient) {
        try {
            const url = new URL(recipient);
            // Ensure it's HTTP or HTTPS
            return url.protocol === 'http:' || url.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
    async performHealthCheck() {
        // Webhooks don't have a persistent connection to check
        // We're healthy if we're initialized and enabled
        return true;
    }
    async onShutdown() {
        // No persistent connections to close
    }
}
exports.WebhookReceiver = WebhookReceiver;
/**
 * Webhook payload validation utilities
 * These can be used by webhook consumers to verify authenticity
 */
class WebhookValidator {
    /**
     * Verify webhook signature
     */
    static verifySignature(payload, signature, secret) {
        const data = JSON.stringify({
            event: payload.event,
            timestamp: payload.timestamp,
        });
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
    /**
     * Verify webhook timestamp to prevent replay attacks
     */
    static verifyTimestamp(timestamp, maxAgeSeconds = 300) {
        const eventTime = new Date(timestamp).getTime();
        const now = Date.now();
        const age = (now - eventTime) / 1000;
        return age >= 0 && age <= maxAgeSeconds;
    }
    /**
     * Full webhook validation
     */
    static validate(payload, signature, secret, maxAgeSeconds = 300) {
        // Verify timestamp
        if (!this.verifyTimestamp(payload.timestamp, maxAgeSeconds)) {
            return {
                valid: false,
                error: 'Webhook timestamp is too old or invalid',
            };
        }
        // Verify signature
        if (!this.verifySignature(payload, signature, secret)) {
            return {
                valid: false,
                error: 'Webhook signature is invalid',
            };
        }
        return { valid: true };
    }
}
exports.WebhookValidator = WebhookValidator;
/**
 * Webhook Event Transform Helpers
 * Pre-built transformations for common integration patterns
 */
class WebhookTransforms {
    /**
     * Transform for PagerDuty Events API v2
     */
    static pagerduty(event) {
        return {
            routing_key: event.context.tenantId,
            event_action: 'trigger',
            payload: {
                summary: event.title,
                severity: event.severity,
                source: event.metadata?.source || 'summit',
                custom_details: {
                    message: event.message,
                    actor: event.actor.name,
                    subject: event.subject.name || event.subject.id,
                    event_id: event.id,
                },
            },
            client: 'Summit',
            client_url: event.subject.url,
        };
    }
    /**
     * Transform for Datadog Events API
     */
    static datadog(event) {
        return {
            title: event.title,
            text: event.message,
            alert_type: event.severity,
            source_type_name: 'summit',
            tags: [
                `tenant:${event.context.tenantId}`,
                `event_type:${event.type}`,
                `actor_type:${event.actor.type}`,
                ...(event.context.tags ? Object.entries(event.context.tags).map(([k, v]) => `${k}:${v}`) : []),
            ],
            aggregation_key: event.metadata?.correlationId || event.id,
        };
    }
    /**
     * Transform for Splunk HEC (HTTP Event Collector)
     */
    static splunk(event) {
        return {
            time: Math.floor(event.timestamp.getTime() / 1000),
            source: event.metadata?.source || 'summit',
            sourcetype: 'summit:notification',
            event: {
                id: event.id,
                type: event.type,
                severity: event.severity,
                title: event.title,
                message: event.message,
                actor: event.actor,
                subject: event.subject,
                context: event.context,
                payload: event.payload,
            },
        };
    }
    /**
     * Transform for Generic JSON format
     */
    static generic(event) {
        return {
            id: event.id,
            type: event.type,
            severity: event.severity,
            title: event.title,
            message: event.message,
            timestamp: event.timestamp.toISOString(),
            actor: event.actor,
            subject: event.subject,
            context: event.context,
            payload: event.payload,
            metadata: event.metadata,
        };
    }
}
exports.WebhookTransforms = WebhookTransforms;
