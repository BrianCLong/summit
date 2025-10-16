import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface MISPConfig {
  baseUrl: string;
  apiKey: string;
  validateSSL: boolean;
  timeout: number;
  retryAttempts: number;
  defaultDistribution: number;
  defaultThreatLevel: number;
  autoPublish: boolean;
}

export interface MISPEvent {
  id?: string;
  uuid?: string;
  info: string;
  date: string;
  threat_level_id: number;
  analysis: number;
  distribution: number;
  sharing_group_id?: number;
  published: boolean;
  attribute_count?: number;
  orgc_id?: number;
  org_id?: number;
  tags?: MISPTag[];
  attributes?: MISPAttribute[];
  galaxy?: MISPGalaxy[];
  related_events?: any[];
  timestamp?: number;
  publish_timestamp?: number;
}

export interface MISPAttribute {
  id?: string;
  uuid?: string;
  event_id?: string;
  object_id?: string;
  category: string;
  type: string;
  value: string;
  comment?: string;
  to_ids: boolean;
  distribution: number;
  sharing_group_id?: number;
  timestamp?: number;
  deleted?: boolean;
  disable_correlation?: boolean;
  object_relation?: string;
  first_seen?: string;
  last_seen?: string;
  tags?: MISPTag[];
}

export interface MISPObject {
  id?: string;
  uuid?: string;
  name: string;
  meta_category: string;
  description: string;
  template_uuid: string;
  template_version: string;
  event_id?: string;
  timestamp?: number;
  distribution: number;
  sharing_group_id?: number;
  comment?: string;
  deleted?: boolean;
  attributes?: MISPAttribute[];
  references?: MISPObjectReference[];
}

export interface MISPObjectReference {
  id?: string;
  uuid?: string;
  timestamp?: number;
  object_id: string;
  referenced_id: string;
  referenced_type: string;
  relationship_type: string;
  comment?: string;
  deleted?: boolean;
}

export interface MISPTag {
  id?: string;
  name: string;
  colour: string;
  exportable: boolean;
  org_id?: string;
  user_id?: string;
  hide_tag?: boolean;
  numerical_value?: number;
  is_galaxy?: boolean;
  is_custom_galaxy?: boolean;
  local_only?: boolean;
}

export interface MISPGalaxy {
  id?: string;
  uuid?: string;
  name: string;
  type: string;
  description: string;
  version: string;
  icon?: string;
  namespace: string;
  kill_chain_order?: Record<string, string[]>;
  galaxy_clusters?: MISPGalaxyCluster[];
}

export interface MISPGalaxyCluster {
  id?: string;
  uuid?: string;
  collection_uuid?: string;
  type: string;
  value: string;
  tag_name: string;
  description?: string;
  galaxy_id?: string;
  source?: string;
  authors?: string[];
  version?: string;
  distribution?: number;
  sharing_group_id?: string;
  org_id?: string;
  orgc_id?: string;
  extends_uuid?: string;
  extends_version?: string;
  published?: boolean;
  deleted?: boolean;
  meta?: Record<string, any>;
  galaxy_cluster_relations?: any[];
}

export interface MISPSearchQuery {
  eventid?: string[];
  withAttachments?: boolean;
  metadata?: boolean;
  type?: string[];
  category?: string[];
  org?: string[];
  tags?: string[];
  from?: string;
  to?: string;
  last?: string;
  eventinfo?: string;
  threatlevel?: string[];
  distribution?: string[];
  analysis?: string[];
  attribute?: string[];
  searchall?: string;
  published?: boolean;
  enforceWarninglist?: boolean;
  sgReferenceOnly?: boolean;
  eventTimestamp?: string;
  limit?: number;
  page?: number;
}

export interface IOCEnrichment {
  ioc: string;
  type: string;
  events: MISPEvent[];
  attributes: MISPAttribute[];
  firstSeen?: Date;
  lastSeen?: Date;
  threatLevel: number;
  confidence: number;
  tags: string[];
  context: {
    malwareFamilies: string[];
    campaigns: string[];
    threatActors: string[];
    techniques: string[];
  };
}

export interface ThreatIntelFeed {
  id: string;
  name: string;
  description: string;
  url: string;
  format: 'json' | 'xml' | 'csv' | 'stix';
  enabled: boolean;
  lastUpdated?: Date;
  nextUpdate?: Date;
  updateInterval: number;
  events: MISPEvent[];
  attributes: MISPAttribute[];
}

export interface MISPMetrics {
  totalEvents: number;
  publishedEvents: number;
  totalAttributes: number;
  totalObjects: number;
  totalTags: number;
  apiCalls: number;
  enrichmentQueries: number;
  averageResponseTime: number;
  errorRate: number;
}

export class MISPConnector extends EventEmitter {
  private config: MISPConfig;
  private metrics: MISPMetrics;
  private feeds = new Map<string, ThreatIntelFeed>();
  private enrichmentCache = new Map<string, IOCEnrichment>();

  constructor(config: MISPConfig) {
    super();
    this.config = config;
    this.metrics = {
      totalEvents: 0,
      publishedEvents: 0,
      totalAttributes: 0,
      totalObjects: 0,
      totalTags: 0,
      apiCalls: 0,
      enrichmentQueries: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
  ): Promise<any> {
    const startTime = Date.now();
    const url = `${this.config.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.config.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      this.metrics.apiCalls++;
      const responseTime = Date.now() - startTime;
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + responseTime) / 2;

      if (!response.ok) {
        this.metrics.errorRate++;
        throw new Error(
          `MISP API error: ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      this.metrics.errorRate++;
      this.emit('api_error', {
        endpoint,
        method,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async createEvent(
    event: Omit<MISPEvent, 'id' | 'uuid' | 'timestamp' | 'publish_timestamp'>,
  ): Promise<MISPEvent> {
    try {
      const response = await this.makeRequest('/events/add', 'POST', {
        Event: event,
      });

      const createdEvent: MISPEvent = response.Event;
      this.metrics.totalEvents++;

      if (createdEvent.published) {
        this.metrics.publishedEvents++;
      }

      this.emit('event_created', {
        eventId: createdEvent.id,
        uuid: createdEvent.uuid,
        info: createdEvent.info,
        threatLevel: createdEvent.threat_level_id,
        timestamp: new Date(),
      });

      return createdEvent;
    } catch (error) {
      this.emit('event_creation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventInfo: event.info,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async getEvent(eventId: string): Promise<MISPEvent> {
    const response = await this.makeRequest(`/events/view/${eventId}`);
    return response.Event;
  }

  async updateEvent(
    eventId: string,
    updates: Partial<MISPEvent>,
  ): Promise<MISPEvent> {
    const response = await this.makeRequest(`/events/edit/${eventId}`, 'POST', {
      Event: updates,
    });

    this.emit('event_updated', {
      eventId,
      updates,
      timestamp: new Date(),
    });

    return response.Event;
  }

  async publishEvent(eventId: string): Promise<MISPEvent> {
    const response = await this.makeRequest(
      `/events/publish/${eventId}`,
      'POST',
    );

    this.metrics.publishedEvents++;

    this.emit('event_published', {
      eventId,
      timestamp: new Date(),
    });

    return response.Event;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.makeRequest(`/events/delete/${eventId}`, 'DELETE');

    this.metrics.totalEvents--;

    this.emit('event_deleted', {
      eventId,
      timestamp: new Date(),
    });
  }

  async addAttribute(
    eventId: string,
    attribute: Omit<MISPAttribute, 'id' | 'uuid' | 'event_id' | 'timestamp'>,
  ): Promise<MISPAttribute> {
    try {
      const response = await this.makeRequest(
        `/attributes/add/${eventId}`,
        'POST',
        { Attribute: attribute },
      );

      const createdAttribute: MISPAttribute = response.Attribute;
      this.metrics.totalAttributes++;

      this.emit('attribute_created', {
        attributeId: createdAttribute.id,
        eventId,
        type: createdAttribute.type,
        value: createdAttribute.value,
        timestamp: new Date(),
      });

      return createdAttribute;
    } catch (error) {
      this.emit('attribute_creation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId,
        attributeType: attribute.type,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async addObject(
    eventId: string,
    object: Omit<MISPObject, 'id' | 'uuid' | 'event_id' | 'timestamp'>,
  ): Promise<MISPObject> {
    try {
      const response = await this.makeRequest(
        `/objects/add/${eventId}`,
        'POST',
        { Object: object },
      );

      const createdObject: MISPObject = response.Object;
      this.metrics.totalObjects++;

      this.emit('object_created', {
        objectId: createdObject.id,
        eventId,
        name: createdObject.name,
        template: createdObject.template_uuid,
        timestamp: new Date(),
      });

      return createdObject;
    } catch (error) {
      this.emit('object_creation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId,
        objectName: object.name,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async addTag(eventId: string, tagName: string): Promise<void> {
    await this.makeRequest(
      `/events/addTag/${eventId}/${encodeURIComponent(tagName)}`,
      'POST',
    );

    this.emit('tag_added', {
      eventId,
      tagName,
      timestamp: new Date(),
    });
  }

  async removeTag(eventId: string, tagName: string): Promise<void> {
    await this.makeRequest(
      `/events/removeTag/${eventId}/${encodeURIComponent(tagName)}`,
      'POST',
    );

    this.emit('tag_removed', {
      eventId,
      tagName,
      timestamp: new Date(),
    });
  }

  async searchEvents(query: MISPSearchQuery): Promise<MISPEvent[]> {
    const response = await this.makeRequest(
      '/events/restSearch',
      'POST',
      query,
    );

    this.emit('events_searched', {
      query,
      resultCount: response.length,
      timestamp: new Date(),
    });

    return response.response || [];
  }

  async searchAttributes(query: MISPSearchQuery): Promise<MISPAttribute[]> {
    const response = await this.makeRequest(
      '/attributes/restSearch',
      'POST',
      query,
    );

    this.emit('attributes_searched', {
      query,
      resultCount: response.length,
      timestamp: new Date(),
    });

    return response.response || [];
  }

  async enrichIOC(ioc: string, type?: string): Promise<IOCEnrichment> {
    const cacheKey = `${ioc}:${type || 'any'}`;
    const cached = this.enrichmentCache.get(cacheKey);

    if (cached && Date.now() - cached.lastSeen!.getTime() < 3600000) {
      // 1 hour cache
      return cached;
    }

    try {
      this.metrics.enrichmentQueries++;

      const searchQuery: MISPSearchQuery = {
        attribute: [ioc],
        type: type ? [type] : undefined,
        enforceWarninglist: false,
        metadata: false,
      };

      const events = await this.searchEvents(searchQuery);
      const attributes = await this.searchAttributes(searchQuery);

      const enrichment: IOCEnrichment = {
        ioc,
        type: type || 'unknown',
        events,
        attributes,
        firstSeen: this.getFirstSeen(attributes),
        lastSeen: new Date(),
        threatLevel: this.calculateThreatLevel(events),
        confidence: this.calculateConfidence(events, attributes),
        tags: this.extractTags(events, attributes),
        context: {
          malwareFamilies: this.extractMalwareFamilies(events),
          campaigns: this.extractCampaigns(events),
          threatActors: this.extractThreatActors(events),
          techniques: this.extractTechniques(events),
        },
      };

      this.enrichmentCache.set(cacheKey, enrichment);

      this.emit('ioc_enriched', {
        ioc,
        type: enrichment.type,
        eventCount: events.length,
        attributeCount: attributes.length,
        threatLevel: enrichment.threatLevel,
        confidence: enrichment.confidence,
        timestamp: new Date(),
      });

      return enrichment;
    } catch (error) {
      this.emit('enrichment_failed', {
        ioc,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  private getFirstSeen(attributes: MISPAttribute[]): Date | undefined {
    const timestamps = attributes
      .map((attr) => attr.first_seen || attr.timestamp)
      .filter((ts) => ts)
      .map((ts) =>
        typeof ts === 'string' ? new Date(ts) : new Date(ts! * 1000),
      );

    return timestamps.length > 0
      ? new Date(Math.min(...timestamps.map((d) => d.getTime())))
      : undefined;
  }

  private calculateThreatLevel(events: MISPEvent[]): number {
    if (events.length === 0) return 1; // Low

    const avgThreatLevel =
      events.reduce((sum, event) => sum + event.threat_level_id, 0) /
      events.length;
    return Math.round(avgThreatLevel);
  }

  private calculateConfidence(
    events: MISPEvent[],
    attributes: MISPAttribute[],
  ): number {
    const factors = [
      events.length > 0 ? 0.3 : 0,
      attributes.length > 0 ? 0.2 : 0,
      (events.filter((e) => e.published).length / Math.max(events.length, 1)) *
        0.3,
      (attributes.filter((a) => a.to_ids).length /
        Math.max(attributes.length, 1)) *
        0.2,
    ];

    return (
      Math.min(
        1,
        factors.reduce((sum, factor) => sum + factor, 0),
      ) * 100
    );
  }

  private extractTags(
    events: MISPEvent[],
    attributes: MISPAttribute[],
  ): string[] {
    const tags = new Set<string>();

    events.forEach((event) => {
      event.tags?.forEach((tag) => tags.add(tag.name));
    });

    attributes.forEach((attr) => {
      attr.tags?.forEach((tag) => tags.add(tag.name));
    });

    return Array.from(tags);
  }

  private extractMalwareFamilies(events: MISPEvent[]): string[] {
    const families = new Set<string>();

    events.forEach((event) => {
      event.tags?.forEach((tag) => {
        if (
          tag.name.includes('malware-family') ||
          tag.name.includes('misp-galaxy:malware')
        ) {
          families.add(tag.name.split(':').pop() || tag.name);
        }
      });
    });

    return Array.from(families);
  }

  private extractCampaigns(events: MISPEvent[]): string[] {
    const campaigns = new Set<string>();

    events.forEach((event) => {
      event.tags?.forEach((tag) => {
        if (
          tag.name.includes('campaign') ||
          tag.name.includes('misp-galaxy:threat-actor')
        ) {
          campaigns.add(tag.name.split(':').pop() || tag.name);
        }
      });
    });

    return Array.from(campaigns);
  }

  private extractThreatActors(events: MISPEvent[]): string[] {
    const actors = new Set<string>();

    events.forEach((event) => {
      event.tags?.forEach((tag) => {
        if (tag.name.includes('threat-actor') || tag.name.includes('apt')) {
          actors.add(tag.name.split(':').pop() || tag.name);
        }
      });
    });

    return Array.from(actors);
  }

  private extractTechniques(events: MISPEvent[]): string[] {
    const techniques = new Set<string>();

    events.forEach((event) => {
      event.tags?.forEach((tag) => {
        if (
          tag.name.includes('mitre-attack') ||
          tag.name.includes('technique')
        ) {
          techniques.add(tag.name.split(':').pop() || tag.name);
        }
      });
    });

    return Array.from(techniques);
  }

  async createThreatFeed(
    feed: Omit<ThreatIntelFeed, 'events' | 'attributes'>,
  ): Promise<ThreatIntelFeed> {
    const newFeed: ThreatIntelFeed = {
      ...feed,
      events: [],
      attributes: [],
    };

    this.feeds.set(feed.id, newFeed);

    if (feed.enabled) {
      await this.updateFeed(feed.id);
    }

    this.emit('feed_created', {
      feedId: feed.id,
      name: feed.name,
      enabled: feed.enabled,
      timestamp: new Date(),
    });

    return newFeed;
  }

  async updateFeed(feedId: string): Promise<ThreatIntelFeed> {
    const feed = this.feeds.get(feedId);
    if (!feed) {
      throw new Error(`Feed ${feedId} not found`);
    }

    try {
      // Simulate feed update by searching for recent events
      const query: MISPSearchQuery = {
        last: '7d',
        published: true,
        limit: 1000,
      };

      const events = await this.searchEvents(query);
      const attributes = await this.searchAttributes(query);

      feed.events = events;
      feed.attributes = attributes;
      feed.lastUpdated = new Date();
      feed.nextUpdate = new Date(Date.now() + feed.updateInterval * 1000);

      this.emit('feed_updated', {
        feedId,
        eventCount: events.length,
        attributeCount: attributes.length,
        timestamp: feed.lastUpdated,
      });

      return feed;
    } catch (error) {
      this.emit('feed_update_failed', {
        feedId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async exportEvent(
    eventId: string,
    format: 'json' | 'xml' | 'stix',
  ): Promise<string> {
    const response = await this.makeRequest(
      `/events/view/${eventId}.${format}`,
    );

    this.emit('event_exported', {
      eventId,
      format,
      timestamp: new Date(),
    });

    return typeof response === 'string' ? response : JSON.stringify(response);
  }

  async bulkImport(
    events: MISPEvent[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const event of events) {
      try {
        await this.createEvent(event);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    this.emit('bulk_import_completed', {
      totalEvents: events.length,
      successful: results.success,
      failed: results.failed,
      timestamp: new Date(),
    });

    return results;
  }

  getFeed(feedId: string): ThreatIntelFeed | undefined {
    return this.feeds.get(feedId);
  }

  listFeeds(): ThreatIntelFeed[] {
    return Array.from(this.feeds.values());
  }

  getMetrics(): MISPMetrics {
    return { ...this.metrics };
  }

  clearCache(): void {
    this.enrichmentCache.clear();

    this.emit('cache_cleared', {
      timestamp: new Date(),
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/servers/getVersion');

      this.emit('connection_tested', {
        success: true,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      this.emit('connection_tested', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });

      return false;
    }
  }
}
