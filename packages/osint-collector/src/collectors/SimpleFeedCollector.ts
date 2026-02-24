/**
 * Simple Feed Collector - Ingests line-delimited feeds (e.g. IPs, domains)
 */

import { CollectorBase } from '../core/CollectorBase.js';
import { CollectionTask, CollectionType, CollectorConfig } from '../types/index.js';
import { validateSafeUrl } from '../utils/security.js';

export interface SimpleFeedConfig extends CollectorConfig {
  feedUrl?: string;
}

/**
 * Collects line-delimited IOC feeds from configured remote URLs.
 *
 * Security invariants:
 * - Every request URL is validated by `validateSafeUrl` before network I/O.
 * - HTTP requests are pinned to the validated resolved IP to avoid DNS TOCTOU.
 * - HTTPS requests retain hostname-based TLS validation (SNI/certificate checks).
 */
export class SimpleFeedCollector extends CollectorBase {
  /**
   * Creates a collector instance with the web-scraping collection type.
   *
   * @param config Collector runtime configuration and optional default feed URL
   */
  constructor(config: SimpleFeedConfig) {
    super({
      ...config,
      type: CollectionType.WEB_SCRAPING // Closest fit
    });
  }

  /**
   * Initializes collector runtime state.
   *
   * Failure modes:
   * - No expected failures; errors are surfaced by base lifecycle handlers.
   */
  protected async onInitialize(): Promise<void> {
    console.log(`[SimpleFeedCollector] Initialized ${this.config.name}`);
  }

  /**
   * Fetches feed content and emits normalized IOC records.
   *
   * Inputs/Outputs:
   * - Input: collection task containing an explicit URL or fallback collector URL.
   * - Output: array of IOC records (line-based values with source metadata).
   *
   * Security invariants:
   * - URL safety validation is mandatory before issuing fetch.
   * - HTTP transport always targets validated resolved IP with Host header preserved.
   *
   * Failure modes:
   * - Throws if URL is missing, invalid, unsafe, or fetch response is non-2xx.
   * - Re-throws parser/network exceptions after logging for observability.
   *
   * @param task Collection request descriptor
   * @returns Parsed IOC records derived from feed lines
   */
  protected async performCollection(task: CollectionTask): Promise<unknown> {
    const url = (task.config?.url as string) || (this.config as SimpleFeedConfig).feedUrl;

    if (!url || typeof url !== 'string') {
      throw new Error('No feed URL provided in task config or collector config');
    }

    console.log(`[SimpleFeedCollector] Fetching feed from ${url}`);

    try {
      const resolvedIp = await validateSafeUrl(url);
      const { fetchUrl, headers } = this.buildFetchTarget(url, resolvedIp);

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

  /**
   * Builds the concrete destination URL and headers for safe outbound fetches.
   *
   * Inputs/Outputs:
   * - Input: original URL + validated resolved IP from `validateSafeUrl`.
   * - Output: fetch target URL and header overrides.
   *
   * Security invariants:
   * - For HTTP, network connection is pinned to `resolvedIp` while preserving Host.
   * - For HTTPS, hostname is preserved to keep TLS certificate validation intact.
   *
   * Failure modes:
   * - Throws if URL parsing fails (invalid URL string).
   *
   * @param url Original feed URL
   * @param resolvedIp Validated destination IP
   * @returns Fetch target URL plus headers
   */
  private buildFetchTarget(
    url: string,
    resolvedIp: string,
  ): { fetchUrl: string; headers: Record<string, string> } {
    const parsed = new URL(url);
    const headers: Record<string, string> = {};

    if (parsed.protocol === 'http:') {
      const originalHost = parsed.hostname;
      parsed.hostname = resolvedIp;
      headers.Host = originalHost;
      return { fetchUrl: parsed.toString(), headers };
    }

    return { fetchUrl: url, headers };
  }

  /**
   * Releases collector resources during shutdown.
   *
   * Failure modes:
   * - No expected failures; errors are surfaced by base lifecycle handlers.
   */
  protected async onShutdown(): Promise<void> {
    console.log(`[SimpleFeedCollector] Shutting down ${this.config.name}`);
  }

  /**
   * Returns the number of IOC records produced by this collection run.
   *
   * @param data Collection output payload
   * @returns Number of records if array payload, otherwise `0`
   */
  protected countRecords(data: unknown): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    return 0;
  }
}
