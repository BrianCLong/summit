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
      const resolvedIp = await validateSafeUrl(url);
      const parsed = new URL(url);

      let fetchUrl = url;
      const headers: Record<string, string> = {};

      if (parsed.protocol === 'http:') {
        // Fix TOCTOU for HTTP by connecting to the resolved IP
        const originalHost = parsed.hostname;
        parsed.hostname = resolvedIp;
        fetchUrl = parsed.toString();
        headers['Host'] = originalHost;
      }
      // Note: For HTTPS, we cannot easily override hostname without breaking certificate validation (SNI).
      // Standard fetch certificate validation provides significant protection against DNS rebinding
      // unless the attacker has a valid certificate for the target domain on the rebinding IP.

      const response = await fetch(fetchUrl, { headers });
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
