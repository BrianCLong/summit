/**
 * SourceConnectors - Adapters for multi-source OSINT data collection
 *
 * Provides unified interface for querying social media, domain registries,
 * dark web sources, and other OSINT data streams with air-gap compatibility.
 */

import crypto from 'crypto';
import {
  OsintSourceConfig,
  OsintSourceType,
  OsintRawData,
  SourceReliability,
  InformationCredibility,
  ClassificationLevel,
} from './types';

export interface SourceConnector {
  readonly config: OsintSourceConfig;
  query(params: SourceQueryParams): Promise<OsintRawData[]>;
  healthCheck(): Promise<SourceHealthStatus>;
  getRateLimitStatus(): RateLimitStatus;
}

export interface SourceQueryParams {
  keywords: string[];
  entityTypes?: string[];
  timeRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

export interface SourceHealthStatus {
  healthy: boolean;
  latencyMs: number;
  lastCheck: Date;
  errors?: string[];
}

export interface RateLimitStatus {
  remaining: number;
  resetAt: Date;
  dailyRemaining: number;
  dailyResetAt: Date;
}

/**
 * Base connector with common functionality
 */
abstract class BaseSourceConnector implements SourceConnector {
  readonly config: OsintSourceConfig;
  protected requestCount: number = 0;
  protected dailyRequestCount: number = 0;
  protected lastResetMinute: number = Date.now();
  protected lastResetDay: number = Date.now();
  protected lastHealthCheck: SourceHealthStatus | null = null;

  constructor(config: OsintSourceConfig) {
    this.config = config;
  }

  abstract query(params: SourceQueryParams): Promise<OsintRawData[]>;

  async healthCheck(): Promise<SourceHealthStatus> {
    const startTime = Date.now();
    try {
      // Subclasses can override for actual health check
      const status: SourceHealthStatus = {
        healthy: true,
        latencyMs: Date.now() - startTime,
        lastCheck: new Date(),
      };
      this.lastHealthCheck = status;
      return status;
    } catch (error) {
      const status: SourceHealthStatus = {
        healthy: false,
        latencyMs: Date.now() - startTime,
        lastCheck: new Date(),
        errors: [String(error)],
      };
      this.lastHealthCheck = status;
      return status;
    }
  }

  getRateLimitStatus(): RateLimitStatus {
    const now = Date.now();
    const minuteElapsed = now - this.lastResetMinute > 60000;
    const dayElapsed = now - this.lastResetDay > 86400000;

    if (minuteElapsed) {
      this.requestCount = 0;
      this.lastResetMinute = now;
    }
    if (dayElapsed) {
      this.dailyRequestCount = 0;
      this.lastResetDay = now;
    }

    return {
      remaining: Math.max(0, this.config.rateLimit.requestsPerMinute - this.requestCount),
      resetAt: new Date(this.lastResetMinute + 60000),
      dailyRemaining: Math.max(0, this.config.rateLimit.requestsPerDay - this.dailyRequestCount),
      dailyResetAt: new Date(this.lastResetDay + 86400000),
    };
  }

  protected checkRateLimit(): boolean {
    const status = this.getRateLimitStatus();
    return status.remaining > 0 && status.dailyRemaining > 0;
  }

  protected incrementRequestCount(): void {
    this.requestCount++;
    this.dailyRequestCount++;
  }

  protected createRawData(
    data: Record<string, any>,
    uri: string,
    latencyMs: number,
    credibility: InformationCredibility = 3,
  ): OsintRawData {
    return {
      sourceId: this.config.id,
      sourceType: this.config.type,
      timestamp: new Date(),
      data,
      metadata: {
        requestId: crypto.randomUUID(),
        latencyMs,
        reliability: this.config.reliability,
        credibility,
        classification: this.config.classification,
      },
      provenance: {
        uri,
        extractor: `osint.${this.config.type}.${this.config.id}`,
        version: '1.0.0',
        checksum: crypto
          .createHash('sha256')
          .update(JSON.stringify(data))
          .digest('hex'),
      },
    };
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryPolicy.maxRetries,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const delay = this.config.retryPolicy.backoffMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Social Media OSINT Connector
 * Aggregates data from social platforms (air-gap compatible via cached feeds)
 */
export class SocialMediaConnector extends BaseSourceConnector {
  constructor(config?: Partial<OsintSourceConfig>) {
    super({
      id: 'social_media_aggregator',
      name: 'Social Media Aggregator',
      type: 'social_media',
      reliability: 'C',
      rateLimit: { requestsPerMinute: 30, requestsPerDay: 1000 },
      timeout: 10000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      airgapCompatible: true,
      classification: 'UNCLASSIFIED',
      ...config,
    });
  }

  async query(params: SourceQueryParams): Promise<OsintRawData[]> {
    if (!this.checkRateLimit()) {
      return [];
    }

    const startTime = Date.now();
    this.incrementRequestCount();

    // In air-gap mode, return cached/simulated data
    // In production, this would connect to social media APIs
    const results: OsintRawData[] = [];

    for (const keyword of params.keywords) {
      const simulatedData = this.generateSimulatedSocialData(keyword);
      results.push(
        this.createRawData(
          simulatedData,
          `social://search/${encodeURIComponent(keyword)}`,
          Date.now() - startTime,
          3,
        ),
      );
    }

    return results;
  }

  private generateSimulatedSocialData(keyword: string): Record<string, any> {
    return {
      query: keyword,
      platform: 'aggregated',
      mentions: [],
      profiles: [],
      hashtags: [],
      timestamp: new Date().toISOString(),
      _simulated: true,
    };
  }
}

/**
 * Domain Registry OSINT Connector
 * Queries WHOIS and DNS data (air-gap compatible)
 */
export class DomainRegistryConnector extends BaseSourceConnector {
  constructor(config?: Partial<OsintSourceConfig>) {
    super({
      id: 'domain_registry',
      name: 'Domain Registry Lookup',
      type: 'domain_registry',
      reliability: 'B',
      rateLimit: { requestsPerMinute: 60, requestsPerDay: 5000 },
      timeout: 15000,
      retryPolicy: { maxRetries: 2, backoffMs: 500 },
      airgapCompatible: true,
      classification: 'UNCLASSIFIED',
      ...config,
    });
  }

  async query(params: SourceQueryParams): Promise<OsintRawData[]> {
    if (!this.checkRateLimit()) {
      return [];
    }

    const startTime = Date.now();
    this.incrementRequestCount();

    const results: OsintRawData[] = [];

    for (const keyword of params.keywords) {
      // Check if keyword looks like a domain
      if (this.isDomainLike(keyword)) {
        const domainData = await this.lookupDomain(keyword);
        results.push(
          this.createRawData(
            domainData,
            `whois://${keyword}`,
            Date.now() - startTime,
            2, // Domain registry data is typically reliable
          ),
        );
      }
    }

    return results;
  }

  private isDomainLike(text: string): boolean {
    return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/.test(text);
  }

  private async lookupDomain(domain: string): Promise<Record<string, any>> {
    // In production, this would perform actual WHOIS lookup
    // For air-gap compatibility, returns structured placeholder
    return {
      domain,
      registrar: null,
      createdDate: null,
      expiryDate: null,
      nameservers: [],
      registrant: null,
      _requiresLiveQuery: true,
    };
  }
}

/**
 * Dark Web OSINT Connector
 * Interfaces with Tor hidden services (requires special configuration)
 */
export class DarkWebConnector extends BaseSourceConnector {
  constructor(config?: Partial<OsintSourceConfig>) {
    super({
      id: 'dark_web_monitor',
      name: 'Dark Web Monitor',
      type: 'dark_web',
      reliability: 'D',
      rateLimit: { requestsPerMinute: 5, requestsPerDay: 100 },
      timeout: 60000,
      retryPolicy: { maxRetries: 1, backoffMs: 5000 },
      airgapCompatible: false, // Requires network access
      classification: 'SECRET',
      ...config,
    });
  }

  async query(params: SourceQueryParams): Promise<OsintRawData[]> {
    if (!this.checkRateLimit()) {
      return [];
    }

    // Dark web queries require special handling
    // In air-gap mode, return empty results
    if (this.config.airgapCompatible === false) {
      return [];
    }

    const startTime = Date.now();
    this.incrementRequestCount();

    // Return placeholder indicating dark web source requires live access
    return [
      this.createRawData(
        {
          query: params.keywords,
          status: 'requires_live_access',
          _simulated: true,
        },
        'onion://monitor',
        Date.now() - startTime,
        5, // Low credibility for simulated data
      ),
    ];
  }
}

/**
 * Public Records Connector
 * Queries government and public databases
 */
export class PublicRecordsConnector extends BaseSourceConnector {
  constructor(config?: Partial<OsintSourceConfig>) {
    super({
      id: 'public_records',
      name: 'Public Records Database',
      type: 'public_records',
      reliability: 'A',
      rateLimit: { requestsPerMinute: 20, requestsPerDay: 500 },
      timeout: 30000,
      retryPolicy: { maxRetries: 3, backoffMs: 2000 },
      airgapCompatible: true,
      classification: 'UNCLASSIFIED',
      ...config,
    });
  }

  async query(params: SourceQueryParams): Promise<OsintRawData[]> {
    if (!this.checkRateLimit()) {
      return [];
    }

    const startTime = Date.now();
    this.incrementRequestCount();

    const results: OsintRawData[] = [];

    for (const keyword of params.keywords) {
      const recordData = this.searchPublicRecords(keyword, params.filters);
      results.push(
        this.createRawData(
          recordData,
          `public-records://search/${encodeURIComponent(keyword)}`,
          Date.now() - startTime,
          1, // High credibility for public records
        ),
      );
    }

    return results;
  }

  private searchPublicRecords(
    keyword: string,
    filters?: Record<string, any>,
  ): Record<string, any> {
    return {
      query: keyword,
      filters,
      records: [],
      totalCount: 0,
      _requiresLiveQuery: true,
    };
  }
}

/**
 * News Media Connector
 * Aggregates news from multiple sources
 */
export class NewsMediaConnector extends BaseSourceConnector {
  constructor(config?: Partial<OsintSourceConfig>) {
    super({
      id: 'news_media',
      name: 'News Media Aggregator',
      type: 'news_media',
      reliability: 'B',
      rateLimit: { requestsPerMinute: 50, requestsPerDay: 2000 },
      timeout: 15000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      airgapCompatible: true,
      classification: 'UNCLASSIFIED',
      ...config,
    });
  }

  async query(params: SourceQueryParams): Promise<OsintRawData[]> {
    if (!this.checkRateLimit()) {
      return [];
    }

    const startTime = Date.now();
    this.incrementRequestCount();

    const results: OsintRawData[] = [];

    const newsData = this.searchNews(params.keywords, params.timeRange);
    results.push(
      this.createRawData(
        newsData,
        `news://search/${encodeURIComponent(params.keywords.join(','))}`,
        Date.now() - startTime,
        2,
      ),
    );

    return results;
  }

  private searchNews(
    keywords: string[],
    timeRange?: { start: Date; end: Date },
  ): Record<string, any> {
    return {
      query: keywords,
      timeRange,
      articles: [],
      sources: [],
      sentiment: null,
      _requiresLiveQuery: true,
    };
  }
}

/**
 * Source Connector Factory
 */
export class SourceConnectorFactory {
  private static connectors: Map<OsintSourceType, SourceConnector> = new Map();

  static getConnector(type: OsintSourceType): SourceConnector {
    let connector = this.connectors.get(type);

    if (!connector) {
      connector = this.createConnector(type);
      this.connectors.set(type, connector);
    }

    return connector;
  }

  static createConnector(type: OsintSourceType): SourceConnector {
    switch (type) {
      case 'social_media':
        return new SocialMediaConnector();
      case 'domain_registry':
        return new DomainRegistryConnector();
      case 'dark_web':
        return new DarkWebConnector();
      case 'public_records':
        return new PublicRecordsConnector();
      case 'news_media':
        return new NewsMediaConnector();
      default:
        // Default to public records for unknown types
        return new PublicRecordsConnector({
          id: `generic_${type}`,
          name: `Generic ${type} Connector`,
          type,
        });
    }
  }

  static getAllConnectors(): Map<OsintSourceType, SourceConnector> {
    const types: OsintSourceType[] = [
      'social_media',
      'domain_registry',
      'dark_web',
      'public_records',
      'news_media',
    ];

    for (const type of types) {
      this.getConnector(type);
    }

    return this.connectors;
  }

  static async healthCheckAll(): Promise<Map<OsintSourceType, SourceHealthStatus>> {
    const results = new Map<OsintSourceType, SourceHealthStatus>();
    const connectors = this.getAllConnectors();

    const checks = Array.from(connectors.entries()).map(async ([type, connector]) => {
      const status = await connector.healthCheck();
      results.set(type, status);
    });

    await Promise.all(checks);
    return results;
  }
}
