/**
 * Usage Metering Service - records usage metrics for billing and analytics
 * Implementation Status (P1-2): In-memory storage with basic aggregation
 */

export interface UsageEvent {
  id: string;
  tenantId: string;
  dimension: string;
  quantity: number;
  unit: string;
  source: string;
  metadata?: Record<string, any>;
  occurredAt: string;
  recordedAt: string;
}

export interface UsageAggregation {
  tenantId: string;
  dimension: string;
  totalQuantity: number;
  eventCount: number;
  startDate: string;
  endDate: string;
}

export class UsageMeteringService {
  private events: Map<string, UsageEvent> = new Map();
  // Optimization: Index events by tenantId for O(1) lookup
  private eventsByTenant: Map<string, UsageEvent[]> = new Map();

  constructor() {
    console.info('[UsageMeteringService] Initialized');
  }

  async record(event: UsageEvent): Promise<void> {
    if (!event.id) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 11);
      event.id = 'usage_' + timestamp + '_' + random;
    }
    this.events.set(event.id, event);

    // Add to tenant index
    let tenantEvents = this.eventsByTenant.get(event.tenantId);
    if (!tenantEvents) {
      tenantEvents = [];
      this.eventsByTenant.set(event.tenantId, tenantEvents);
    }
    tenantEvents.push(event);

    console.debug('[UsageMeteringService] Recorded:', event.tenantId, event.dimension, event.quantity);
  }

  async getAggregation(tenantId: string, dimension: string, startDate: string, endDate: string): Promise<UsageAggregation> {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    let totalQuantity = 0;
    let eventCount = 0;

    // Use tenant index instead of iterating all events
    const tenantEvents = this.eventsByTenant.get(tenantId) || [];

    for (const event of tenantEvents) {
      if (event.dimension !== dimension) continue;
      const occurredTime = new Date(event.occurredAt).getTime();
      if (occurredTime < start || occurredTime > end) continue;
      totalQuantity += event.quantity;
      eventCount++;
    }

    return { tenantId, dimension, totalQuantity, eventCount, startDate, endDate };
  }

  async getEvents(tenantId: string, options?: { dimension?: string; startDate?: string; endDate?: string; limit?: number }): Promise<UsageEvent[]> {
    const events: UsageEvent[] = [];
    const start = options?.startDate ? new Date(options.startDate).getTime() : 0;
    const end = options?.endDate ? new Date(options.endDate).getTime() : Date.now();
    const limit = options?.limit || 1000;

    // Use tenant index instead of iterating all events
    const tenantEvents = this.eventsByTenant.get(tenantId) || [];

    for (const event of tenantEvents) {
      if (options?.dimension && event.dimension !== options.dimension) continue;
      const occurredTime = new Date(event.occurredAt).getTime();
      if (occurredTime < start || occurredTime > end) continue;
      events.push(event);
      if (events.length >= limit) break;
    }

    events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return events;
  }
}

export const usageMeteringService = new UsageMeteringService();
