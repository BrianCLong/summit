/**
 * Summit Work Graph - Event Bus
 */

export interface WorkGraphEvent {
  id: string;
  type: EventType;
  source: EventSource;
  timestamp: Date;
  actor: ActorInfo;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type EventType =
  | 'node.created' | 'node.updated' | 'node.deleted' | 'node.status_changed'
  | 'edge.created' | 'edge.deleted'
  | 'ticket.assigned' | 'ticket.completed' | 'ticket.blocked' | 'ticket.unblocked'
  | 'pr.opened' | 'pr.merged' | 'pr.closed'
  | 'plan.synthesized' | 'plan.replanned' | 'critical_path.changed'
  | 'contract.published' | 'contract.assigned' | 'bid.submitted' | 'work.completed'
  | 'policy.violation' | 'policy.waiver_requested' | 'policy.waiver_approved'
  | 'commitment.at_risk' | 'commitment.delivered' | 'commitment.broken'
  | 'sync.linear' | 'sync.jira' | 'webhook.received';

export interface EventSource {
  system: 'work-graph' | 'linear' | 'jira' | 'github' | 'slack' | 'agent';
  component?: string;
  nodeId?: string;
}

export interface ActorInfo {
  id: string;
  type: 'human' | 'agent' | 'system' | 'webhook';
  name?: string;
}

export interface EventFilter {
  types?: EventType[];
  sources?: string[];
  actors?: string[];
  since?: Date;
  until?: Date;
}

export type EventHandler = (event: WorkGraphEvent) => void | Promise<void>;

export interface Subscription {
  id: string;
  filter: EventFilter;
  handler: EventHandler;
  createdAt: Date;
}

export interface WebhookConfig {
  id: string;
  url: string;
  secret?: string;
  events: EventType[];
  enabled: boolean;
  retryPolicy: { maxRetries: number; backoffMs: number };
}

export class EventBus {
  private subscriptions: Map<string, Subscription> = new Map();
  private webhooks: Map<string, WebhookConfig> = new Map();
  private eventLog: WorkGraphEvent[] = [];
  private maxLogSize = 10000;

  async publish(event: Omit<WorkGraphEvent, 'id' | 'timestamp'>): Promise<string> {
    const fullEvent: WorkGraphEvent = { ...event, id: crypto.randomUUID(), timestamp: new Date() };
    this.eventLog.push(fullEvent);
    if (this.eventLog.length > this.maxLogSize) this.eventLog = this.eventLog.slice(-this.maxLogSize / 2);

    const subs = Array.from(this.subscriptions.values()).filter(s => this.matchesFilter(fullEvent, s.filter));
    await Promise.all(subs.map(async s => { try { await s.handler(fullEvent); } catch (e) { console.error('Handler error:', e); } }));
    await this.dispatchWebhooks(fullEvent);
    return fullEvent.id;
  }

  subscribe(filter: EventFilter, handler: EventHandler): string {
    const sub: Subscription = { id: crypto.randomUUID(), filter, handler, createdAt: new Date() };
    this.subscriptions.set(sub.id, sub);
    return sub.id;
  }

  unsubscribe(id: string): boolean { return this.subscriptions.delete(id); }

  registerWebhook(config: Omit<WebhookConfig, 'id'>): string {
    const wh: WebhookConfig = { ...config, id: crypto.randomUUID() };
    this.webhooks.set(wh.id, wh);
    return wh.id;
  }

  removeWebhook(id: string): boolean { return this.webhooks.delete(id); }

  queryEvents(filter: EventFilter, limit = 100): WorkGraphEvent[] {
    return this.eventLog.filter(e => this.matchesFilter(e, filter)).slice(-limit);
  }

  getNodeEvents(nodeId: string, limit = 50): WorkGraphEvent[] {
    return this.eventLog.filter(e => e.source.nodeId === nodeId || e.payload.nodeId === nodeId).slice(-limit);
  }

  static createNodeEvent(type: EventType, nodeId: string, nodeType: string, actor: ActorInfo, changes?: Record<string, unknown>): Omit<WorkGraphEvent, 'id' | 'timestamp'> {
    return { type, source: { system: 'work-graph', component: 'node-store', nodeId }, actor, payload: { nodeId, nodeType, ...changes } };
  }

  static createTicketEvent(type: 'ticket.assigned' | 'ticket.completed' | 'ticket.blocked' | 'ticket.unblocked', ticketId: string, actor: ActorInfo, details: Record<string, unknown> = {}): Omit<WorkGraphEvent, 'id' | 'timestamp'> {
    return { type, source: { system: 'work-graph', component: 'ticket-manager', nodeId: ticketId }, actor, payload: { ticketId, ...details } };
  }

  private matchesFilter(event: WorkGraphEvent, filter: EventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) return false;
    if (filter.sources && !filter.sources.includes(event.source.system)) return false;
    if (filter.actors && !filter.actors.includes(event.actor.id)) return false;
    if (filter.since && event.timestamp < filter.since) return false;
    if (filter.until && event.timestamp > filter.until) return false;
    return true;
  }

  private async dispatchWebhooks(event: WorkGraphEvent): Promise<void> {
    const matching = Array.from(this.webhooks.values()).filter(w => w.enabled && w.events.includes(event.type));
    await Promise.all(matching.map(wh => this.sendWebhook(wh, event)));
  }

  private async sendWebhook(wh: WebhookConfig, event: WorkGraphEvent, attempt = 1): Promise<void> {
    try {
      const body = JSON.stringify({ event: event.type, timestamp: event.timestamp.toISOString(), data: event.payload, source: event.source, actor: event.actor });
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Event-ID': event.id, 'X-Event-Type': event.type };
      if (wh.secret) headers['X-Signature'] = await this.computeSignature(body, wh.secret);
      const response = await fetch(wh.url, { method: 'POST', headers, body });
      if (!response.ok && attempt < wh.retryPolicy.maxRetries) {
        await new Promise(r => setTimeout(r, wh.retryPolicy.backoffMs * attempt));
        return this.sendWebhook(wh, event, attempt + 1);
      }
    } catch (error) {
      if (attempt < wh.retryPolicy.maxRetries) {
        await new Promise(r => setTimeout(r, wh.retryPolicy.backoffMs * attempt));
        return this.sendWebhook(wh, event, attempt + 1);
      }
      console.error(`Webhook ${wh.id} failed:`, error);
    }
  }

  private async computeSignature(body: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    return Buffer.from(signature).toString('hex');
  }
}

export const eventBus = new EventBus();
