/**
 * Simple Feed Collector - Ingests line-delimited feeds (e.g. IPs, domains)
 */

import { CollectorBase } from '../core/CollectorBase.js';
import { CollectionTask, CollectionType, CollectorConfig } from '../types/index.js';
import { validateSafeUrl } from '../utils/security.js';

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

  protected async performCollection(task: CollectionTask): Promise<unknown> {
    const url = (task.config?.url as string) || (this.config as SimpleFeedConfig).feedUrl;

    if (!url || typeof url !== 'string') {
      throw new Error('No feed URL provided in task config or collector config');
    }

    console.log(`[SimpleFeedCollector] Fetching feed from ${url}`);

    try {
      await validateSafeUrl(url);

      const response = await fetch(url);
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
