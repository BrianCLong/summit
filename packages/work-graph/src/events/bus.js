"use strict";
/**
 * Summit Work Graph - Event Bus
 *
 * Real-time event system for work graph changes, enabling:
 * - Continuous re-planning triggers
 * - External system notifications
 * - Audit logging
 * - Webhook dispatching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.EventBus = void 0;
// ============================================
// Event Bus
// ============================================
class EventBus {
    subscriptions = new Map();
    webhooks = new Map();
    eventLog = [];
    maxLogSize = 10000;
    async publish(event) {
        const fullEvent = {
            ...event,
            id: crypto.randomUUID(),
            timestamp: new Date(),
        };
        this.eventLog.push(fullEvent);
        if (this.eventLog.length > this.maxLogSize) {
            this.eventLog = this.eventLog.slice(-this.maxLogSize / 2);
        }
        const matchingSubscriptions = this.findMatchingSubscriptions(fullEvent);
        await Promise.all(matchingSubscriptions.map(async (sub) => {
            try {
                await sub.handler(fullEvent);
            }
            catch (error) {
                console.error(`Event handler error for subscription ${sub.id}:`, error);
            }
        }));
        await this.dispatchWebhooks(fullEvent);
        return fullEvent.id;
    }
    subscribe(filter, handler) {
        const subscription = {
            id: crypto.randomUUID(),
            filter,
            handler,
            createdAt: new Date(),
        };
        this.subscriptions.set(subscription.id, subscription);
        return subscription.id;
    }
    unsubscribe(subscriptionId) {
        return this.subscriptions.delete(subscriptionId);
    }
    registerWebhook(config) {
        const webhook = { ...config, id: crypto.randomUUID() };
        this.webhooks.set(webhook.id, webhook);
        return webhook.id;
    }
    removeWebhook(webhookId) {
        return this.webhooks.delete(webhookId);
    }
    queryEvents(filter, limit = 100) {
        return this.eventLog.filter((event) => this.matchesFilter(event, filter)).slice(-limit);
    }
    getNodeEvents(nodeId, limit = 50) {
        return this.eventLog
            .filter((e) => e.source.nodeId === nodeId || e.payload.nodeId === nodeId)
            .slice(-limit);
    }
    static createNodeEvent(type, nodeId, nodeType, actor, changes) {
        return {
            type,
            source: { system: 'work-graph', component: 'node-store', nodeId },
            actor,
            payload: { nodeId, nodeType, ...changes },
        };
    }
    static createTicketEvent(type, ticketId, actor, details = {}) {
        return {
            type,
            source: { system: 'work-graph', component: 'ticket-manager', nodeId: ticketId },
            actor,
            payload: { ticketId, ...details },
        };
    }
    static createPlanEvent(type, planId, actor, details = {}) {
        return {
            type,
            source: { system: 'work-graph', component: 'planner' },
            actor,
            payload: { planId, ...details },
        };
    }
    static createMarketEvent(type, contractId, actor, details = {}) {
        return {
            type,
            source: { system: 'work-graph', component: 'market' },
            actor,
            payload: { contractId, ...details },
        };
    }
    static createCommitmentEvent(type, commitmentId, customer, actor, details = {}) {
        return {
            type,
            source: { system: 'work-graph', component: 'commitment-tracker', nodeId: commitmentId },
            actor,
            payload: { commitmentId, customer, ...details },
        };
    }
    findMatchingSubscriptions(event) {
        return Array.from(this.subscriptions.values()).filter((sub) => this.matchesFilter(event, sub.filter));
    }
    matchesFilter(event, filter) {
        if (filter.types && !filter.types.includes(event.type))
            return false;
        if (filter.sources && !filter.sources.includes(event.source.system))
            return false;
        if (filter.actors && !filter.actors.includes(event.actor.id))
            return false;
        if (filter.since && event.timestamp < filter.since)
            return false;
        if (filter.until && event.timestamp > filter.until)
            return false;
        return true;
    }
    async dispatchWebhooks(event) {
        const matchingWebhooks = Array.from(this.webhooks.values()).filter((w) => w.enabled && w.events.includes(event.type));
        await Promise.all(matchingWebhooks.map((webhook) => this.sendWebhook(webhook, event)));
    }
    async sendWebhook(webhook, event, attempt = 1) {
        try {
            const body = JSON.stringify({
                event: event.type,
                timestamp: event.timestamp.toISOString(),
                data: event.payload,
                source: event.source,
                actor: event.actor,
            });
            const headers = {
                'Content-Type': 'application/json',
                'X-Event-ID': event.id,
                'X-Event-Type': event.type,
            };
            if (webhook.secret) {
                headers['X-Signature'] = await this.computeSignature(body, webhook.secret);
            }
            const response = await fetch(webhook.url, { method: 'POST', headers, body });
            if (!response.ok && attempt < webhook.retryPolicy.maxRetries) {
                await new Promise((r) => setTimeout(r, webhook.retryPolicy.backoffMs * attempt));
                return this.sendWebhook(webhook, event, attempt + 1);
            }
        }
        catch (error) {
            if (attempt < webhook.retryPolicy.maxRetries) {
                await new Promise((r) => setTimeout(r, webhook.retryPolicy.backoffMs * attempt));
                return this.sendWebhook(webhook, event, attempt + 1);
            }
            console.error(`Webhook ${webhook.id} failed after ${attempt} attempts:`, error);
        }
    }
    async computeSignature(body, secret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
        return Buffer.from(signature).toString('hex');
    }
}
exports.EventBus = EventBus;
exports.eventBus = new EventBus();
