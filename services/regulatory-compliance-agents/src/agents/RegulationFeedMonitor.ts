import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import type { RegulationSource, Regulation, AgentEvent } from '../types/index.js';
import { createAgentLogger } from '../utils/logger.js';

const logger = createAgentLogger('RegulationFeedMonitor');

interface FeedItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  guid?: string;
  category?: string | string[];
}

/**
 * RegulationFeedMonitor - Autonomous agent that continuously monitors
 * regulatory sources (RSS feeds, APIs, webhooks) for new regulations,
 * policies, and legal updates across multiple jurisdictions.
 */
export class RegulationFeedMonitor extends EventEmitter {
  private sources: Map<string, RegulationSource> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private seenRegulations: Set<string> = new Set();
  private xmlParser: XMLParser;

  constructor() {
    super();
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  /**
   * Register a regulatory source to monitor
   */
  registerSource(source: RegulationSource): void {
    this.sources.set(source.id, source);
    logger.info({ sourceId: source.id, name: source.name }, 'Registered regulation source');
  }

  /**
   * Start monitoring all registered sources
   */
  startMonitoring(): void {
    logger.info({ sourceCount: this.sources.size }, 'Starting regulatory feed monitoring');

    for (const [id, source] of this.sources) {
      if (!source.enabled) continue;

      // Initial fetch
      this.fetchSource(source).catch(err =>
        logger.error({ sourceId: id, error: err.message }, 'Initial fetch failed')
      );

      // Set up polling interval
      const interval = setInterval(
        () => this.fetchSource(source).catch(err =>
          logger.error({ sourceId: id, error: err.message }, 'Polling fetch failed')
        ),
        source.pollingIntervalMinutes * 60 * 1000
      );

      this.pollingIntervals.set(id, interval);
    }
  }

  /**
   * Stop monitoring all sources
   */
  stopMonitoring(): void {
    for (const [id, interval] of this.pollingIntervals) {
      clearInterval(interval);
      logger.info({ sourceId: id }, 'Stopped monitoring source');
    }
    this.pollingIntervals.clear();
  }

  /**
   * Fetch and parse regulations from a source
   */
  private async fetchSource(source: RegulationSource): Promise<void> {
    logger.debug({ sourceId: source.id, type: source.type }, 'Fetching source');

    try {
      switch (source.type) {
        case 'rss':
          await this.fetchRSSFeed(source);
          break;
        case 'api':
          await this.fetchAPIEndpoint(source);
          break;
        default:
          logger.warn({ type: source.type }, 'Unsupported source type');
      }

      // Update last checked timestamp
      source.lastChecked = new Date();
    } catch (error) {
      logger.error({ sourceId: source.id, error }, 'Failed to fetch source');
      throw error;
    }
  }

  /**
   * Fetch and parse RSS feed
   */
  private async fetchRSSFeed(source: RegulationSource): Promise<void> {
    const response = await axios.get(source.url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'IntelGraph-Compliance-Monitor/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    const parsed = this.xmlParser.parse(response.data);
    const items: FeedItem[] = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];

    for (const item of Array.isArray(items) ? items : [items]) {
      await this.processRSSItem(source, item);
    }

    logger.info({ sourceId: source.id, itemCount: items.length }, 'Processed RSS feed');
  }

  /**
   * Process a single RSS item
   */
  private async processRSSItem(source: RegulationSource, item: FeedItem): Promise<void> {
    const externalId = item.guid || item.link || item.title;
    const dedupeKey = `${source.id}:${externalId}`;

    if (this.seenRegulations.has(dedupeKey)) {
      return;
    }

    this.seenRegulations.add(dedupeKey);

    const regulation: Regulation = {
      id: uuid(),
      sourceId: source.id,
      externalId,
      title: item.title || 'Untitled Regulation',
      summary: item.description,
      jurisdiction: source.jurisdiction,
      regulatoryBody: source.name,
      categories: this.extractCategories(item, source),
      publishedDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      status: 'proposed',
      url: item.link || source.url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.emitRegulationDetected(regulation);
  }

  /**
   * Fetch from API endpoint (EUR-Lex, etc.)
   */
  private async fetchAPIEndpoint(source: RegulationSource): Promise<void> {
    const response = await axios.get(source.url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'IntelGraph-Compliance-Monitor/1.0',
        Accept: 'application/json',
        ...source.credentials,
      },
      params: {
        // Default params for regulatory APIs
        pageSize: 50,
        sortBy: 'publishedDate',
        sortOrder: 'desc',
      },
    });

    const items = response.data?.results || response.data?.items || response.data || [];

    for (const item of items) {
      await this.processAPIItem(source, item);
    }

    logger.info({ sourceId: source.id, itemCount: items.length }, 'Processed API endpoint');
  }

  /**
   * Process API response item
   */
  private async processAPIItem(source: RegulationSource, item: Record<string, unknown>): Promise<void> {
    const externalId = String(item.id || item.celex || item.documentId || item.uri);
    const dedupeKey = `${source.id}:${externalId}`;

    if (this.seenRegulations.has(dedupeKey)) {
      return;
    }

    this.seenRegulations.add(dedupeKey);

    const regulation: Regulation = {
      id: uuid(),
      sourceId: source.id,
      externalId,
      title: String(item.title || item.name || 'Untitled'),
      summary: String(item.summary || item.abstract || item.description || ''),
      jurisdiction: source.jurisdiction,
      regulatoryBody: String(item.author || item.institution || source.name),
      categories: source.categories,
      publishedDate: item.publishedDate ? new Date(String(item.publishedDate)) : new Date(),
      effectiveDate: item.effectiveDate ? new Date(String(item.effectiveDate)) : undefined,
      status: this.mapStatus(String(item.status || 'proposed')),
      url: String(item.url || item.uri || source.url),
      metadata: item,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.emitRegulationDetected(regulation);
  }

  /**
   * Extract categories from feed item
   */
  private extractCategories(item: FeedItem, source: RegulationSource): string[] {
    const categories = new Set<string>(source.categories);

    if (item.category) {
      const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
      itemCategories.forEach(c => categories.add(String(c).toLowerCase()));
    }

    return Array.from(categories);
  }

  /**
   * Map external status to internal status
   */
  private mapStatus(status: string): Regulation['status'] {
    const statusMap: Record<string, Regulation['status']> = {
      draft: 'draft',
      proposed: 'proposed',
      final: 'final',
      effective: 'effective',
      superseded: 'superseded',
      in_force: 'effective',
      adopted: 'final',
    };
    return statusMap[status.toLowerCase()] || 'proposed';
  }

  /**
   * Emit regulation detected event
   */
  private emitRegulationDetected(regulation: Regulation): void {
    const event: AgentEvent = {
      id: uuid(),
      type: 'regulation_detected',
      payload: regulation,
      timestamp: new Date(),
      agentId: 'RegulationFeedMonitor',
    };

    logger.info(
      { regulationId: regulation.id, title: regulation.title, jurisdiction: regulation.jurisdiction },
      'New regulation detected'
    );

    this.emit('regulation_detected', event);
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    sourcesRegistered: number;
    sourcesActive: number;
    regulationsDetected: number;
  } {
    return {
      sourcesRegistered: this.sources.size,
      sourcesActive: this.pollingIntervals.size,
      regulationsDetected: this.seenRegulations.size,
    };
  }
}
