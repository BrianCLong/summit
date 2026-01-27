/**
 * Simple Feed Collector - Ingests line-delimited feeds (e.g. IPs, domains)
 */

import { CollectorBase } from '../core/CollectorBase.js';
import { CollectionTask, CollectionType, CollectorConfig } from '../types/index.js';

export interface SimpleFeedConfig extends CollectorConfig {
  feedUrl?: string;
}

export class SimpleFeedCollector extends CollectorBase {
  constructor(config: SimpleFeedConfig) {
    super({
      ...config,
      type: CollectionType.WEB_SCRAPING // Closest fit
    });
  }

  protected async onInitialize(): Promise<void> {
    console.log(`[SimpleFeedCollector] Initialized ${this.config.name}`);
  }

  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Invalid protocol: ${parsed.protocol}`);
      }

      const hostname = parsed.hostname;

      // Basic SSRF Protection
      // Block localhost, private ranges, metadata services
      if (hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '[::1]' ||
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('169.254.') ||
          (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31)
      ) {
        throw new Error(`SSRF Protection: Access to ${hostname} is blocked`);
      }
    } catch (error) {
       throw new Error(`Invalid URL or Security Violation: ${(error as Error).message}`);
    }
  }

  protected async performCollection(task: CollectionTask): Promise<unknown> {
    const url = task.config?.url || (this.config as SimpleFeedConfig).feedUrl;

    if (!url) {
      throw new Error('No feed URL provided in task config or collector config');
    }

    // Validate URL (SSRF)
    this.validateUrl(url as string);

    console.log(`[SimpleFeedCollector] Fetching feed from ${url}`);

    try {
      const response = await fetch(url as string);
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();

      // Process the data
      const lines = text.split('\n');
      const iocs = lines
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      return iocs.map(ioc => ({
        type: 'ip', // Simplified assumption for MVP
        value: ioc,
        source: url,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error(`[SimpleFeedCollector] Error fetching feed:`, error);
      throw error;
    }
  }

  protected async onShutdown(): Promise<void> {
    console.log(`[SimpleFeedCollector] Shutting down ${this.config.name}`);
  }

  protected countRecords(data: unknown): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    return 0;
  }
}
