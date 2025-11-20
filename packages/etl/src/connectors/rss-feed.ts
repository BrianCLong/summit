import Parser from 'rss-parser';
import { BaseConnector, ConnectorMetadata } from './base.js';
import type { ConnectorConfig } from '../types.js';

/**
 * RSS/Atom Feed Connector Configuration
 */
export interface RssFeedConfig {
  feedUrls: string[];
  includeContent?: boolean;
  includeEnclosures?: boolean;
  customFields?: {
    feed?: string[];
    item?: string[];
  };
  lastFetchDate?: string; // ISO date string for incremental fetches
}

/**
 * RSS/Atom Feed Item
 */
export interface FeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  categories?: string[];
  isoDate?: string;
  enclosures?: Array<{
    url: string;
    type?: string;
    length?: number;
  }>;
  [key: string]: unknown;
}

/**
 * RSS/Atom Feed Connector
 * Supports multiple feeds, incremental fetches, and custom field extraction
 */
export class RssFeedConnector extends BaseConnector {
  private parser: Parser;
  private feedConfig: RssFeedConfig;

  constructor(config: ConnectorConfig) {
    super(config);
    this.feedConfig = config.config as RssFeedConfig;

    // Initialize RSS parser
    this.parser = new Parser({
      customFields: this.feedConfig.customFields
    });
  }

  async connect(): Promise<void> {
    try {
      // Validate feed URLs
      if (!this.feedConfig.feedUrls || this.feedConfig.feedUrls.length === 0) {
        throw new Error('No feed URLs configured');
      }

      // Test first feed
      await this.withRateLimit(() =>
        this.parser.parseURL(this.feedConfig.feedUrls[0])
      );

      this.connected = true;
      this.emit('connected');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }

  async test(): Promise<boolean> {
    try {
      if (!this.feedConfig.feedUrls || this.feedConfig.feedUrls.length === 0) {
        return false;
      }

      await this.withRateLimit(() =>
        this.parser.parseURL(this.feedConfig.feedUrls[0])
      );
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<FeedItem, void, unknown> {
    if (!this.connected) {
      await this.connect();
    }

    const lastFetchDate = this.feedConfig.lastFetchDate
      ? new Date(this.feedConfig.lastFetchDate)
      : null;

    for (const feedUrl of this.feedConfig.feedUrls) {
      try {
        const feed = await this.withRateLimit(() =>
          this.parser.parseURL(feedUrl)
        );

        this.emit('feed-metadata', {
          title: feed.title,
          description: feed.description,
          link: feed.link,
          feedUrl,
          itemCount: feed.items.length
        });

        for (const item of feed.items) {
          // Skip items older than last fetch date if doing incremental fetch
          if (lastFetchDate && item.isoDate) {
            const itemDate = new Date(item.isoDate);
            if (itemDate <= lastFetchDate) {
              continue;
            }
          }

          // Transform item
          const transformedItem: FeedItem = {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            creator: item.creator,
            guid: item.guid,
            categories: item.categories,
            isoDate: item.isoDate
          };

          // Include content if configured
          if (this.feedConfig.includeContent) {
            transformedItem.content = item.content;
            transformedItem.contentSnippet = item.contentSnippet;
          }

          // Include enclosures if configured
          if (this.feedConfig.includeEnclosures && item.enclosure) {
            transformedItem.enclosures = [item.enclosure];
          }

          // Include custom fields
          if (this.feedConfig.customFields?.item) {
            for (const field of this.feedConfig.customFields.item) {
              if (field in item) {
                transformedItem[field] = item[field];
              }
            }
          }

          // Add metadata
          transformedItem._feed = {
            title: feed.title,
            url: feedUrl
          };

          yield transformedItem;
          this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
        }
      } catch (error) {
        this.handleError(error as Error);
        this.emit('feed-error', { feedUrl, error });
        // Continue with next feed
        continue;
      }
    }

    this.finish();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'RSS/Atom Feed Connector',
      type: 'RSS_FEED',
      version: '1.0.0',
      description: 'Ingests data from RSS and Atom feeds',
      capabilities: [
        'multi_feed',
        'incremental_fetch',
        'custom_fields',
        'rate_limiting'
      ],
      requiredConfig: ['feedUrls']
    };
  }
}
