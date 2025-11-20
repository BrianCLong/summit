import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseConnector, ConnectorMetadata } from './base.js';
import type { ConnectorConfig } from '../types.js';

/**
 * Web Scraper Configuration
 */
export interface WebScraperConfig {
  urls: string[];
  selectors: {
    [key: string]: string; // CSS selectors for data extraction
  };
  pagination?: {
    enabled: boolean;
    nextPageSelector: string;
    maxPages?: number;
  };
  userAgent?: string;
  followLinks?: {
    enabled: boolean;
    linkSelector: string;
    maxDepth?: number;
  };
  headers?: Record<string, string>;
  timeout?: number;
  respectRobotsTxt?: boolean;
}

/**
 * Scraped Data Record
 */
export interface ScrapedData {
  url: string;
  scrapedAt: Date;
  data: Record<string, string | string[]>;
  metadata: {
    title?: string;
    description?: string;
    depth: number;
  };
}

/**
 * Web Scraper Connector
 * Supports CSS selectors, pagination, and link following with rate limiting
 */
export class WebScraperConnector extends BaseConnector {
  private scraperConfig: WebScraperConfig;
  private visitedUrls: Set<string> = new Set();

  constructor(config: ConnectorConfig) {
    super(config);
    this.scraperConfig = config.config as WebScraperConfig;
  }

  async connect(): Promise<void> {
    try {
      // Validate configuration
      if (!this.scraperConfig.urls || this.scraperConfig.urls.length === 0) {
        throw new Error('No URLs configured for scraping');
      }

      if (!this.scraperConfig.selectors || Object.keys(this.scraperConfig.selectors).length === 0) {
        throw new Error('No selectors configured for data extraction');
      }

      // Test first URL
      await this.testUrl(this.scraperConfig.urls[0]);

      this.connected = true;
      this.emit('connected');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.visitedUrls.clear();
    this.connected = false;
    this.emit('disconnected');
  }

  async test(): Promise<boolean> {
    try {
      if (!this.scraperConfig.urls || this.scraperConfig.urls.length === 0) {
        return false;
      }
      await this.testUrl(this.scraperConfig.urls[0]);
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  private async testUrl(url: string): Promise<void> {
    await this.withRateLimit(() =>
      axios.get(url, {
        timeout: 5000,
        headers: this.getRequestHeaders()
      })
    );
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<ScrapedData, void, unknown> {
    if (!this.connected) {
      await this.connect();
    }

    for (const url of this.scraperConfig.urls) {
      yield* this.scrapeUrl(url, 0);
    }

    this.finish();
  }

  /**
   * Scrape a single URL
   */
  private async *scrapeUrl(url: string, depth: number): AsyncGenerator<ScrapedData, void, unknown> {
    // Skip if already visited
    if (this.visitedUrls.has(url)) {
      return;
    }

    this.visitedUrls.add(url);

    try {
      const response = await this.withRateLimit(() =>
        axios.get(url, {
          timeout: this.scraperConfig.timeout || 30000,
          headers: this.getRequestHeaders()
        })
      );

      const $ = cheerio.load(response.data);

      // Extract data using selectors
      const data: Record<string, string | string[]> = {};

      for (const [key, selector] of Object.entries(this.scraperConfig.selectors)) {
        const elements = $(selector);

        if (elements.length === 0) {
          data[key] = '';
        } else if (elements.length === 1) {
          data[key] = elements.first().text().trim();
        } else {
          data[key] = elements
            .map((_, el) => $(el).text().trim())
            .get();
        }
      }

      // Extract metadata
      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || '';

      const scrapedData: ScrapedData = {
        url,
        scrapedAt: new Date(),
        data,
        metadata: {
          title,
          description,
          depth
        }
      };

      yield scrapedData;
      this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);

      // Handle pagination
      if (this.scraperConfig.pagination?.enabled) {
        yield* this.handlePagination($, url, depth);
      }

      // Follow links if configured
      if (
        this.scraperConfig.followLinks?.enabled &&
        (!this.scraperConfig.followLinks.maxDepth || depth < this.scraperConfig.followLinks.maxDepth)
      ) {
        yield* this.followLinks($, url, depth);
      }
    } catch (error) {
      this.handleError(error as Error);
      this.emit('scrape-error', { url, error, depth });
    }
  }

  /**
   * Handle pagination
   */
  private async *handlePagination(
    $: cheerio.CheerioAPI,
    currentUrl: string,
    depth: number
  ): AsyncGenerator<ScrapedData, void, unknown> {
    const pagination = this.scraperConfig.pagination!;
    const nextPageElement = $(pagination.nextPageSelector);

    if (nextPageElement.length > 0) {
      let nextPageUrl = nextPageElement.attr('href');

      if (nextPageUrl) {
        // Handle relative URLs
        nextPageUrl = this.resolveUrl(nextPageUrl, currentUrl);

        // Check max pages
        const currentPage = this.visitedUrls.size;
        if (!pagination.maxPages || currentPage < pagination.maxPages) {
          yield* this.scrapeUrl(nextPageUrl, depth);
        }
      }
    }
  }

  /**
   * Follow links to scrape nested pages
   */
  private async *followLinks(
    $: cheerio.CheerioAPI,
    currentUrl: string,
    depth: number
  ): AsyncGenerator<ScrapedData, void, unknown> {
    const followLinks = this.scraperConfig.followLinks!;
    const linkElements = $(followLinks.linkSelector);

    for (let i = 0; i < linkElements.length; i++) {
      const element = linkElements.eq(i);
      let linkUrl = element.attr('href');

      if (linkUrl) {
        // Handle relative URLs
        linkUrl = this.resolveUrl(linkUrl, currentUrl);

        // Only follow links within the same domain
        const currentDomain = new URL(currentUrl).hostname;
        const linkDomain = new URL(linkUrl).hostname;

        if (currentDomain === linkDomain) {
          yield* this.scrapeUrl(linkUrl, depth + 1);
        }
      }
    }
  }

  /**
   * Resolve relative URLs
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  /**
   * Get request headers
   */
  private getRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent':
        this.scraperConfig.userAgent ||
        'Mozilla/5.0 (compatible; IntelGraphBot/1.0)',
      ...this.scraperConfig.headers,
      ...this.getAuthHeaders(this.config.auth)
    };

    return headers;
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Web Scraper Connector',
      type: 'WEB_SCRAPER',
      version: '1.0.0',
      description: 'Scrapes data from websites using CSS selectors',
      capabilities: [
        'css_selectors',
        'pagination',
        'link_following',
        'rate_limiting',
        'depth_control'
      ],
      requiredConfig: ['urls', 'selectors']
    };
  }
}
