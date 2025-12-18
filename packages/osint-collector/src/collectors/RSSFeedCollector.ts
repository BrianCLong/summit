/**
 * RSS Feed Collector - Monitors RSS/Atom feeds for news and updates
 */

import { CollectorBase } from '../core/CollectorBase.js';
import type { CollectionTask } from '../types/index.js';
import Parser from 'rss-parser';

export interface RSSItem {
  title: string;
  link: string;
  pubDate?: Date;
  author?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  categories?: string[];
  enclosure?: {
    url: string;
    type: string;
    length?: string;
  };
}

export class RSSFeedCollector extends CollectorBase {
  private parser: Parser;
  private feedCache: Map<string, Date> = new Map();

  constructor(config: any) {
    super(config);
    this.parser = new Parser({
      customFields: {
        item: ['media:content', 'media:thumbnail']
      }
    });
  }

  protected async onInitialize(): Promise<void> {
    console.log(`Initializing ${this.config.name}`);
  }

  protected async performCollection(task: CollectionTask): Promise<unknown> {
    const feedUrl = task.target;
    const since = this.feedCache.get(feedUrl);

    const items = await this.fetchFeed(feedUrl, since);
    this.feedCache.set(feedUrl, new Date());

    return items;
  }

  protected async onShutdown(): Promise<void> {
    this.feedCache.clear();
  }

  protected countRecords(data: unknown): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    return 0;
  }

  /**
   * Fetch and parse RSS feed
   */
  async fetchFeed(url: string, since?: Date): Promise<RSSItem[]> {
    try {
      const feed = await this.parser.parseURL(url);
      let items = feed.items.map(item => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
        author: item.creator || item.author,
        content: item.content,
        contentSnippet: item.contentSnippet,
        guid: item.guid,
        categories: item.categories,
        enclosure: item.enclosure
      }));

      // Filter by date if specified
      if (since) {
        items = items.filter(item =>
          item.pubDate && item.pubDate > since
        );
      }

      return items;
    } catch (error) {
      throw new Error(`Failed to fetch RSS feed ${url}: ${error}`);
    }
  }

  /**
   * Monitor multiple feeds
   */
  async monitorFeeds(urls: string[]): Promise<Map<string, RSSItem[]>> {
    const results = new Map<string, RSSItem[]>();

    await Promise.all(
      urls.map(async url => {
        try {
          const items = await this.fetchFeed(url);
          results.set(url, items);
        } catch (error) {
          console.error(`Error fetching feed ${url}:`, error);
          results.set(url, []);
        }
      })
    );

    return results;
  }

  /**
   * Search feed items by keyword
   */
  searchItems(items: RSSItem[], keyword: string): RSSItem[] {
    const lowerKeyword = keyword.toLowerCase();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(lowerKeyword) ||
        item.contentSnippet?.toLowerCase().includes(lowerKeyword) ||
        item.content?.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Get items by category
   */
  filterByCategory(items: RSSItem[], category: string): RSSItem[] {
    return items.filter(
      item =>
        item.categories &&
        item.categories.some(cat => cat.toLowerCase().includes(category.toLowerCase()))
    );
  }
}
