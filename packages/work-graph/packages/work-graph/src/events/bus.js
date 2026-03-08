"use strict";
/**
 * Summit Work Graph - Event Bus
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.EventBus = void 0;
class EventBus {
    subscriptions = new Map();
    webhooks = new Map();
    eventLog = [];
    maxLogSize = 10000;
    async publish(event) {
        const fullEvent = { ...event, id: crypto.randomUUID(), timestamp: new Date() };
        this.eventLog.push(fullEvent);
        if (this.eventLog.length > this.maxLogSize)
            this.eventLog = this.eventLog.slice(-this.maxLogSize / 2);
        const subs = Array.from(this.subscriptions.values()).filter(s => this.matchesFilter(fullEvent, s.filter));
        await Promise.all(subs.map(async (s) => { try {
            await s.handler(fullEvent);
        }
        catch (e) {
            console.error('Handler error:', e);
        } }));
        await this.dispatchWebhooks(fullEvent);
        return fullEvent.id;
    }
    subscribe(filter, handler) {
        const sub = { id: crypto.randomUUID(), filter, handler, createdAt: new Date() };
        this.subscriptions.set(sub.id, sub);
        return sub.id;
    }
    unsubscribe(id) { return this.subscriptions.delete(id); }
    registerWebhook(config) {
        const wh = { ...config, id: crypto.randomUUID() };
        this.webhooks.set(wh.id, wh);
        return wh.id;
    }
    removeWebhook(id) { return this.webhooks.delete(id); }
    queryEvents(filter, limit = 100) {
        return this.eventLog.filter(e => this.matchesFilter(e, filter)).slice(-limit);
    }
    getNodeEvents(nodeId, limit = 50) {
        return this.eventLog.filter(e => e.source.nodeId === nodeId || e.payload.nodeId === nodeId).slice(-limit);
    }
    static createNodeEvent(type, nodeId, nodeType, actor, changes) {
        return { type, source: { system: 'work-graph', component: 'node-store', nodeId }, actor, payload: { nodeId, nodeType, ...changes } };
    }
    static createTicketEvent(type, ticketId, actor, details = {}) {
        return { type, source: { system: 'work-graph', component: 'ticket-manager', nodeId: ticketId }, actor, payload: { ticketId, ...details } };
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
        const matching = Array.from(this.webhooks.values()).filter(w => w.enabled && w.events.includes(event.type));
        await Promise.all(matching.map(wh => this.sendWebhook(wh, event)));
    }
    async sendWebhook(wh, event, attempt = 1) {
        try {
            const body = JSON.stringify({ event: event.type, timestamp: event.timestamp.toISOString(), data: event.payload, source: event.source, actor: event.actor });
            const headers = { 'Content-Type': 'application/json', 'X-Event-ID': event.id, 'X-Event-Type': event.type };
            if (wh.secret)
                headers['X-Signature'] = await this.computeSignature(body, wh.secret);
            const response = await fetch(wh.url, { method: 'POST', headers, body });
            if (!response.ok && attempt < wh.retryPolicy.maxRetries) {
                await new Promise(r => setTimeout(r, wh.retryPolicy.backoffMs * attempt));
                return this.sendWebhook(wh, event, attempt + 1);
            }
        }
        catch (error) {
            if (attempt < wh.retryPolicy.maxRetries) {
                await new Promise(r => setTimeout(r, wh.retryPolicy.backoffMs * attempt));
                return this.sendWebhook(wh, event, attempt + 1);
            }
            console.error(`Webhook ${wh.id} failed:`, error);
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
