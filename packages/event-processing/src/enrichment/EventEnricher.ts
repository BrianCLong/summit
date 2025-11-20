/**
 * Event Enrichment
 * Enriches events with additional context from various sources
 */

import { EventEmitter } from 'events';
import type { Event, EnrichmentRule } from '../types.js';

export class EventEnricher extends EventEmitter {
  private enrichmentRules: Map<string, EnrichmentRule[]> = new Map();
  private lookupCache: Map<string, any> = new Map();
  private cacheMaxSize: number = 10000;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor() {
    super();
  }

  /**
   * Register enrichment rule
   */
  registerEnrichmentRule(rule: EnrichmentRule): void {
    const rules = this.enrichmentRules.get(rule.eventType) || [];
    rules.push(rule);
    this.enrichmentRules.set(rule.eventType, rules);
    console.log(`Registered enrichment rule: ${rule.id} for event type: ${rule.eventType}`);
  }

  /**
   * Remove enrichment rule
   */
  removeEnrichmentRule(ruleId: string): void {
    for (const [eventType, rules] of this.enrichmentRules) {
      const filtered = rules.filter(r => r.id !== ruleId);
      this.enrichmentRules.set(eventType, filtered);
    }
  }

  /**
   * Enrich a single event
   */
  async enrichEvent(event: Event): Promise<Event> {
    const rules = this.enrichmentRules.get(event.eventType) || [];

    if (rules.length === 0) {
      return event;
    }

    const enrichedData: Record<string, any> = { ...event.enrichedData };

    for (const rule of rules) {
      try {
        const data = await this.applyEnrichment(event, rule);
        Object.assign(enrichedData, data);
      } catch (error) {
        console.error(`Enrichment failed for rule ${rule.id}:`, error);
        this.emit('enrichment:error', { event, rule, error });
      }
    }

    const enrichedEvent: Event = {
      ...event,
      enrichedData,
    };

    this.emit('event:enriched', enrichedEvent);
    return enrichedEvent;
  }

  /**
   * Enrich multiple events
   */
  async enrichEvents(events: Event[]): Promise<Event[]> {
    return Promise.all(events.map(event => this.enrichEvent(event)));
  }

  /**
   * Apply specific enrichment rule
   */
  private async applyEnrichment(event: Event, rule: EnrichmentRule): Promise<Record<string, any>> {
    switch (rule.enrichmentType) {
      case 'lookup':
        return this.lookupEnrichment(event, rule);
      case 'api':
        return this.apiEnrichment(event, rule);
      case 'geo':
        return this.geoEnrichment(event, rule);
      case 'custom':
        if (rule.handler) {
          return rule.handler(event);
        }
        return {};
      default:
        return {};
    }
  }

  /**
   * Lookup-based enrichment
   */
  private async lookupEnrichment(event: Event, rule: EnrichmentRule): Promise<Record<string, any>> {
    const lookupKey = rule.config.keyField;
    const lookupValue = this.getEventFieldValue(event, lookupKey);

    if (!lookupValue) {
      return {};
    }

    // Check cache
    const cacheKey = `${rule.id}:${lookupValue}`;
    if (this.lookupCache.has(cacheKey)) {
      this.cacheHits++;
      return this.lookupCache.get(cacheKey);
    }

    this.cacheMisses++;

    // In a real implementation, this would query a database or external service
    const enrichmentData = {
      lookupField: lookupValue,
      enrichedAt: Date.now(),
    };

    // Add to cache
    this.addToCache(cacheKey, enrichmentData);

    return enrichmentData;
  }

  /**
   * API-based enrichment
   */
  private async apiEnrichment(event: Event, rule: EnrichmentRule): Promise<Record<string, any>> {
    // In a real implementation, this would make HTTP requests to external APIs
    const apiUrl = rule.config.apiUrl;
    const apiKey = rule.config.apiKey;

    // Mock API call
    return {
      apiEnriched: true,
      apiSource: apiUrl,
      enrichedAt: Date.now(),
    };
  }

  /**
   * Geographic enrichment
   */
  private async geoEnrichment(event: Event, rule: EnrichmentRule): Promise<Record<string, any>> {
    const ipField = rule.config.ipField || 'ip';
    const ipAddress = this.getEventFieldValue(event, ipField);

    if (!ipAddress) {
      return {};
    }

    // Check cache
    const cacheKey = `geo:${ipAddress}`;
    if (this.lookupCache.has(cacheKey)) {
      this.cacheHits++;
      return this.lookupCache.get(cacheKey);
    }

    this.cacheMisses++;

    // In a real implementation, this would use MaxMind GeoIP or similar
    const geoData = {
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      lat: 37.7749,
      lon: -122.4194,
      timezone: 'America/Los_Angeles',
    };

    this.addToCache(cacheKey, geoData);

    return geoData;
  }

  /**
   * Get field value from event
   */
  private getEventFieldValue(event: Event, field: string): any {
    const parts = field.split('.');
    let value: any = event;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Add to cache with LRU eviction
   */
  private addToCache(key: string, value: any): void {
    if (this.lookupCache.size >= this.cacheMaxSize) {
      // Remove oldest entry (first key in Map)
      const firstKey = this.lookupCache.keys().next().value;
      this.lookupCache.delete(firstKey);
    }

    this.lookupCache.set(key, value);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.lookupCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? this.cacheHits / total : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate,
      size: this.lookupCache.size,
    };
  }
}
