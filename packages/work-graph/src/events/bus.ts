/**
 * Summit Work Graph - Event Bus
 *
 * Real-time event system for work graph changes, enabling:
 * - Continuous re-planning triggers
 * - External system notifications
 * - Audit logging
 * - Webhook dispatching
 */

// ============================================
// Event Types
// ============================================

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
  // Node lifecycle
  | 'node.created'
  | 'node.updated'
  | 'node.deleted'
  | 'node.status_changed'
  // Edge lifecycle
  | 'edge.created'
  | 'edge.deleted'
  // Work lifecycle
  | 'ticket.assigned'
  | 'ticket.completed'
  | 'ticket.blocked'
  | 'ticket.unblocked'
  | 'pr.opened'
  | 'pr.merged'
  | 'pr.closed'
  // Planning
  | 'plan.synthesized'
  | 'plan.replanned'
  | 'critical_path.changed'
  // Market
  | 'contract.published'
  | 'contract.assigned'
  | 'bid.submitted'
  | 'work.completed'
  // Policy
  | 'policy.violation'
  | 'policy.waiver_requested'
  | 'policy.waiver_approved'
  // Commitments
  | 'commitment.at_risk'
  | 'commitment.delivered'
  | 'commitment.broken'
  // System
  | 'sync.linear'
  | 'sync.jira'
  | 'webhook.received';

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

// ============================================
// Event Bus
// ============================================

export class EventBus {
  private subscriptions: Map<string, Subscription> = new Map();
  private webhooks: Map<string, WebhookConfig> = new Map();
  private eventLog: WorkGraphEvent[] = [];
  private maxLogSize = 10000;

  async publish(event: Omit<WorkGraphEvent, 'id' | 'timestamp'>): Promise<string> {
    const fullEvent: WorkGraphEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.eventLog.push(fullEvent);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize / 2);
    }

    const matchingSubscriptions = this.findMatchingSubscriptions(fullEvent);
    await Promise.all(
      matchingSubscriptions.map(async (sub) => {
        try { await sub.handler(fullEvent); }
        catch (error) { console.error(`Event handler error for subscription ${sub.id}:`, error); }
      })
    );

    await this.dispatchWebhooks(fullEvent);
    return fullEvent.id;
  }

  subscribe(filter: EventFilter, handler: EventHandler): string {
    const subscription: Subscription = {
      id: crypto.randomUUID(),
      filter,
      handler,
      createdAt: new Date(),
    };
    this.subscriptions.set(subscription.id, subscription);
    return subscription.id;
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  registerWebhook(config: Omit<WebhookConfig, 'id'>): string {
    const webhook: WebhookConfig = { ...config, id: crypto.randomUUID() };
    this.webhooks.set(webhook.id, webhook);
    return webhook.id;
  }

  removeWebhook(webhookId: string): boolean {
    return this.webhooks.delete(webhookId);
  }

  queryEvents(filter: EventFilter, limit: number = 100): WorkGraphEvent[] {
    return this.eventLog.filter((event) => this.matchesFilter(event, filter)).slice(-limit);
  }

  getNodeEvents(nodeId: string, limit: number = 50): WorkGraphEvent[] {
    return this.eventLog
      .filter((e) => e.source.nodeId === nodeId || e.payload.nodeId === nodeId)
      .slice(-limit);
  }

  static createNodeEvent(
    type: EventType,
    nodeId: string,
    nodeType: string,
    actor: ActorInfo,
    changes?: Record<string, unknown>
  ): Omit<WorkGraphEvent, 'id' | 'timestamp'> {
    return {
      type,
      source: { system: 'work-graph', component: 'node-store', nodeId },
      actor,
      payload: { nodeId, nodeType, ...changes },
    };
  }

  static createTicketEvent(
    type: 'ticket.assigned' | 'ticket.completed' | 'ticket.blocked' | 'ticket.unblocked',
    ticketId: string,
    actor: ActorInfo,
    details: Record<string, unknown> = {}
  ): Omit<WorkGraphEvent, 'id' | 'timestamp'> {
    return {
      type,
      source: { system: 'work-graph', component: 'ticket-manager', nodeId: ticketId },
      actor,
      payload: { ticketId, ...details },
    };
  }

  static createPlanEvent(
    type: 'plan.synthesized' | 'plan.replanned' | 'critical_path.changed',
    planId: string,
    actor: ActorInfo,
    details: Record<string, unknown> = {}
  ): Omit<WorkGraphEvent, 'id' | 'timestamp'> {
    return {
      type,
      source: { system: 'work-graph', component: 'planner' },
      actor,
      payload: { planId, ...details },
    };
  }

  static createMarketEvent(
    type: 'contract.published' | 'contract.assigned' | 'bid.submitted' | 'work.completed',
    contractId: string,
    actor: ActorInfo,
    details: Record<string, unknown> = {}
  ): Omit<WorkGraphEvent, 'id' | 'timestamp'> {
    return {
      type,
      source: { system: 'work-graph', component: 'market' },
      actor,
      payload: { contractId, ...details },
    };
  }

  static createCommitmentEvent(
    type: 'commitment.at_risk' | 'commitment.delivered' | 'commitment.broken',
    commitmentId: string,
    customer: string,
    actor: ActorInfo,
    details: Record<string, unknown> = {}
  ): Omit<WorkGraphEvent, 'id' | 'timestamp'> {
    return {
      type,
      source: { system: 'work-graph', component: 'commitment-tracker', nodeId: commitmentId },
      actor,
      payload: { commitmentId, customer, ...details },
    };
  }

  private findMatchingSubscriptions(event: WorkGraphEvent): Subscription[] {
    return Array.from(this.subscriptions.values()).filter((sub) => this.matchesFilter(event, sub.filter));
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
    const matchingWebhooks = Array.from(this.webhooks.values()).filter(
      (w) => w.enabled && w.events.includes(event.type)
    );
    await Promise.all(matchingWebhooks.map((webhook) => this.sendWebhook(webhook, event)));
  }

  private async sendWebhook(webhook: WebhookConfig, event: WorkGraphEvent, attempt: number = 1): Promise<void> {
    try {
      const body = JSON.stringify({
        event: event.type,
        timestamp: event.timestamp.toISOString(),
        data: event.payload,
        source: event.source,
        actor: event.actor,
      });

      const headers: Record<string, string> = {
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
    } catch (error) {
      if (attempt < webhook.retryPolicy.maxRetries) {
        await new Promise((r) => setTimeout(r, webhook.retryPolicy.backoffMs * attempt));
        return this.sendWebhook(webhook, event, attempt + 1);
      }
      console.error(`Webhook ${webhook.id} failed after ${attempt} attempts:`, error);
    }
  }

  private async computeSignature(body: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    return Buffer.from(signature).toString('hex');
  }
}

export const eventBus = new EventBus();
