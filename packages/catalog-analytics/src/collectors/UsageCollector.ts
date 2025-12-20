/**
 * Usage Collector
 * Collects and stores usage events from the catalog
 */

import {
  UsageEvent,
  UsageEventType,
  AssetUsageMetrics,
} from '@intelgraph/data-catalog';

export interface IUsageStore {
  recordEvent(event: UsageEvent): Promise<void>;
  getAssetMetrics(assetId: string, startDate: Date, endDate: Date): Promise<AssetUsageMetrics>;
  getEvents(filters: EventFilters): Promise<UsageEvent[]>;
}

export interface EventFilters {
  assetId?: string;
  userId?: string;
  eventType?: UsageEventType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class UsageCollector {
  constructor(private store: IUsageStore) {}

  /**
   * Record view event
   */
  async recordView(assetId: string, userId: string, sessionId: string, metadata: Record<string, any> = {}): Promise<void> {
    const event: UsageEvent = {
      id: this.generateEventId(),
      eventType: UsageEventType.VIEW,
      assetId,
      userId,
      sessionId,
      metadata,
      timestamp: new Date(),
    };

    await this.store.recordEvent(event);
  }

  /**
   * Record search event
   */
  async recordSearch(query: string, userId: string, sessionId: string, resultCount: number): Promise<void> {
    const event: UsageEvent = {
      id: this.generateEventId(),
      eventType: UsageEventType.SEARCH,
      assetId: '', // Search not tied to specific asset
      userId,
      sessionId,
      metadata: { query, resultCount },
      timestamp: new Date(),
    };

    await this.store.recordEvent(event);
  }

  /**
   * Record download event
   */
  async recordDownload(assetId: string, userId: string, sessionId: string): Promise<void> {
    const event: UsageEvent = {
      id: this.generateEventId(),
      eventType: UsageEventType.DOWNLOAD,
      assetId,
      userId,
      sessionId,
      metadata: {},
      timestamp: new Date(),
    };

    await this.store.recordEvent(event);
  }

  /**
   * Record edit event
   */
  async recordEdit(assetId: string, userId: string, sessionId: string, changes: Record<string, any>): Promise<void> {
    const event: UsageEvent = {
      id: this.generateEventId(),
      eventType: UsageEventType.EDIT,
      assetId,
      userId,
      sessionId,
      metadata: { changes },
      timestamp: new Date(),
    };

    await this.store.recordEvent(event);
  }

  /**
   * Record comment event
   */
  async recordComment(assetId: string, userId: string, sessionId: string, commentId: string): Promise<void> {
    const event: UsageEvent = {
      id: this.generateEventId(),
      eventType: UsageEventType.COMMENT,
      assetId,
      userId,
      sessionId,
      metadata: { commentId },
      timestamp: new Date(),
    };

    await this.store.recordEvent(event);
  }

  /**
   * Record share event
   */
  async recordShare(assetId: string, userId: string, sessionId: string, sharedWith: string[]): Promise<void> {
    const event: UsageEvent = {
      id: this.generateEventId(),
      eventType: UsageEventType.SHARE,
      assetId,
      userId,
      sessionId,
      metadata: { sharedWith },
      timestamp: new Date(),
    };

    await this.store.recordEvent(event);
  }

  /**
   * Record bookmark event
   */
  async recordBookmark(assetId: string, userId: string, sessionId: string): Promise<void> {
    const event: UsageEvent = {
      id: this.generateEventId(),
      eventType: UsageEventType.BOOKMARK,
      assetId,
      userId,
      sessionId,
      metadata: {},
      timestamp: new Date(),
    };

    await this.store.recordEvent(event);
  }

  /**
   * Record rating event
   */
  async recordRating(assetId: string, userId: string, sessionId: string, rating: number): Promise<void> {
    const event: UsageEvent = {
      id: this.generateEventId(),
      eventType: UsageEventType.RATE,
      assetId,
      userId,
      sessionId,
      metadata: { rating },
      timestamp: new Date(),
    };

    await this.store.recordEvent(event);
  }

  /**
   * Get asset usage metrics
   */
  async getAssetMetrics(assetId: string, startDate: Date, endDate: Date): Promise<AssetUsageMetrics> {
    return this.store.getAssetMetrics(assetId, startDate, endDate);
  }

  /**
   * Get usage events
   */
  async getEvents(filters: EventFilters): Promise<UsageEvent[]> {
    return this.store.getEvents(filters);
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
