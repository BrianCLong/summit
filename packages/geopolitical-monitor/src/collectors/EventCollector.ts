/**
 * Event Collector - Data collection from various sources
 */

import { EventEmitter } from 'events';
import {
  GeopoliticalEvent,
  EventSource,
  EventType,
  RiskLevel,
  Actor,
  EventImpact
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface DataSource {
  id: string;
  name: string;
  type: EventSource;
  url?: string;
  apiKey?: string;
  enabled: boolean;
  reliability: number; // 0-1
}

export class EventCollector extends EventEmitter {
  private sources: Map<string, DataSource>;
  private collectionInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.sources = new Map();
  }

  /**
   * Register a data source
   */
  registerSource(source: DataSource): void {
    this.sources.set(source.id, source);
    console.log(`Registered data source: ${source.name}`);
  }

  /**
   * Remove a data source
   */
  removeSource(sourceId: string): void {
    this.sources.delete(sourceId);
  }

  /**
   * Start collecting events
   */
  async startCollection(intervalMs: number = 60000): Promise<void> {
    console.log('Starting event collection...');

    // Initial collection
    await this.collectFromAllSources();

    // Set up periodic collection
    this.collectionInterval = setInterval(() => {
      this.collectFromAllSources();
    }, intervalMs);
  }

  /**
   * Stop collecting events
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
    console.log('Stopped event collection');
  }

  /**
   * Collect from all enabled sources
   */
  private async collectFromAllSources(): Promise<void> {
    const enabledSources = Array.from(this.sources.values())
      .filter(s => s.enabled);

    for (const source of enabledSources) {
      try {
        await this.collectFromSource(source);
      } catch (error) {
        console.error(`Error collecting from ${source.name}:`, error);
        this.emit('collection-error', { source: source.id, error });
      }
    }
  }

  /**
   * Collect from a specific source
   */
  private async collectFromSource(source: DataSource): Promise<void> {
    // This is a template - actual implementation would integrate with real APIs
    // For demonstration, we emit a sample event

    const sampleEvent = this.createSampleEvent(source);
    this.emit('event-collected', sampleEvent);
  }

  /**
   * Create a sample event for demonstration
   */
  private createSampleEvent(source: DataSource): GeopoliticalEvent {
    return {
      id: uuidv4(),
      type: EventType.POLITICAL_TRANSITION,
      title: 'Sample Political Event',
      description: `Event collected from ${source.name}`,
      country: 'SAMPLE',
      region: 'SAMPLE_REGION',
      timestamp: new Date(),
      source: source.type,
      sourceUrl: source.url,
      riskLevel: RiskLevel.MEDIUM,
      confidence: source.reliability,
      verified: false,
      tags: ['sample'],
      actors: [],
      affectedCountries: [],
      impact: {
        economic: 50,
        political: 60,
        social: 40,
        security: 30,
        overall: 45,
        affectedSectors: ['government']
      },
      sentiment: 0,
      volatilityScore: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {}
    };
  }

  /**
   * Parse news article into event
   */
  parseNewsEvent(article: {
    title: string;
    content: string;
    url: string;
    publishedAt: Date;
    source: string;
  }): GeopoliticalEvent | null {
    // This would use NLP to extract structured data from news
    // For now, return a basic event structure

    return {
      id: uuidv4(),
      type: this.inferEventType(article.title, article.content),
      title: article.title,
      description: article.content.substring(0, 500),
      country: this.extractCountry(article.content),
      region: this.extractRegion(article.content),
      timestamp: article.publishedAt,
      source: EventSource.NEWS_MEDIA,
      sourceUrl: article.url,
      riskLevel: this.assessRiskLevel(article.content),
      confidence: 0.7,
      verified: false,
      tags: this.extractTags(article.content),
      actors: this.extractActors(article.content),
      affectedCountries: [],
      impact: this.assessImpact(article.content),
      sentiment: this.analyzeSentiment(article.content),
      volatilityScore: this.calculateVolatility(article.content),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { originalSource: article.source }
    };
  }

  /**
   * Infer event type from text
   */
  private inferEventType(title: string, content: string): EventType {
    const text = (title + ' ' + content).toLowerCase();

    if (text.includes('election')) return EventType.ELECTION;
    if (text.includes('protest')) return EventType.PROTEST;
    if (text.includes('coup')) return EventType.COUP;
    if (text.includes('summit') || text.includes('meeting')) return EventType.SUMMIT;
    if (text.includes('sanction')) return EventType.SANCTIONS_IMPOSED;
    if (text.includes('treaty')) return EventType.TREATY_SIGNED;
    if (text.includes('legislation') || text.includes('law')) return EventType.LEGISLATION_PROPOSED;

    return EventType.POLITICAL_TRANSITION;
  }

  /**
   * Extract country from text
   */
  private extractCountry(text: string): string {
    // Simplified - would use NER in production
    return 'UNKNOWN';
  }

  /**
   * Extract region from text
   */
  private extractRegion(text: string): string {
    // Simplified - would use geographic analysis
    return 'UNKNOWN';
  }

  /**
   * Assess risk level from content
   */
  private assessRiskLevel(content: string): RiskLevel {
    const text = content.toLowerCase();
    let score = 0;

    // Keywords indicating high risk
    if (text.includes('war') || text.includes('conflict')) score += 30;
    if (text.includes('crisis')) score += 20;
    if (text.includes('violence')) score += 25;
    if (text.includes('coup')) score += 40;
    if (text.includes('emergency')) score += 15;

    if (score >= 50) return RiskLevel.CRITICAL;
    if (score >= 30) return RiskLevel.HIGH;
    if (score >= 15) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tags: string[] = [];
    const text = content.toLowerCase();

    if (text.includes('economy') || text.includes('economic')) tags.push('economic');
    if (text.includes('security')) tags.push('security');
    if (text.includes('military')) tags.push('military');
    if (text.includes('trade')) tags.push('trade');
    if (text.includes('democracy')) tags.push('democracy');
    if (text.includes('human rights')) tags.push('human-rights');

    return tags;
  }

  /**
   * Extract actors from content
   */
  private extractActors(content: string): Actor[] {
    // Simplified - would use NER for entity extraction
    return [];
  }

  /**
   * Assess event impact
   */
  private assessImpact(content: string): EventImpact {
    const text = content.toLowerCase();

    return {
      economic: text.includes('economic') ? 70 : 30,
      political: text.includes('political') ? 80 : 40,
      social: text.includes('social') ? 60 : 30,
      security: text.includes('security') || text.includes('military') ? 75 : 25,
      overall: 50,
      affectedSectors: []
    };
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(content: string): number {
    const text = content.toLowerCase();
    let sentiment = 0;

    // Positive keywords
    if (text.includes('peace')) sentiment += 0.2;
    if (text.includes('agreement')) sentiment += 0.2;
    if (text.includes('cooperation')) sentiment += 0.15;

    // Negative keywords
    if (text.includes('conflict')) sentiment -= 0.25;
    if (text.includes('crisis')) sentiment -= 0.2;
    if (text.includes('violence')) sentiment -= 0.3;

    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Calculate volatility score
   */
  private calculateVolatility(content: string): number {
    const text = content.toLowerCase();
    let volatility = 0;

    if (text.includes('sudden')) volatility += 20;
    if (text.includes('unexpected')) volatility += 20;
    if (text.includes('crisis')) volatility += 25;
    if (text.includes('urgent')) volatility += 15;

    return Math.min(100, volatility);
  }
}
