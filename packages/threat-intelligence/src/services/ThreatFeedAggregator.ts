/**
 * Threat Feed Aggregator
 * Aggregates and normalizes threat intelligence from multiple sources
 */

import axios from 'axios';
import PQueue from 'p-queue';
import NodeCache from 'node-cache';
import { IOC, IOCType, Severity, ThreatType, Confidence } from '../types/ioc.js';
import { StixBundle } from '../types/stix.js';
import { TaxiiClient, createTaxiiClient } from './TaxiiClient.js';
import { MispClient, createMispClient, MispAttribute, MispEvent } from './MispClient.js';
import { StixProcessor } from './StixProcessor.js';

export interface FeedConfig {
  id: string;
  name: string;
  type: FeedType;
  enabled: boolean;
  url?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  pollInterval?: number;
  priority: number;
  tags?: string[];
  tlpOverride?: string;
  config?: any;
}

export type FeedType =
  | 'taxii'
  | 'misp'
  | 'otx'
  | 'virustotal'
  | 'abuseipdb'
  | 'urlhaus'
  | 'threatfox'
  | 'alienvault'
  | 'recordedfuture'
  | 'threatconnect'
  | 'custom_json'
  | 'custom_csv'
  | 'stix';

export interface FeedStats {
  feedId: string;
  feedName: string;
  lastPoll: string;
  nextPoll?: string;
  totalFetched: number;
  totalProcessed: number;
  totalErrors: number;
  lastError?: string;
  status: 'active' | 'error' | 'disabled';
}

export class ThreatFeedAggregator {
  private feeds: Map<string, FeedConfig> = new Map();
  private feedStats: Map<string, FeedStats> = new Map();
  private clients: Map<string, any> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private queue: PQueue;
  private cache: NodeCache;
  private stixProcessor: StixProcessor;

  constructor() {
    this.queue = new PQueue({ concurrency: 5 });
    this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
    this.stixProcessor = new StixProcessor();
  }

  /**
   * Register a threat feed
   */
  registerFeed(config: FeedConfig): void {
    this.feeds.set(config.id, config);

    // Initialize stats
    this.feedStats.set(config.id, {
      feedId: config.id,
      feedName: config.name,
      lastPoll: new Date(0).toISOString(),
      totalFetched: 0,
      totalProcessed: 0,
      totalErrors: 0,
      status: config.enabled ? 'active' : 'disabled',
    });

    // Initialize client
    if (config.enabled) {
      this.initializeClient(config);
    }

    console.log(`[FEED_AGGREGATOR] Registered feed: ${config.name} (${config.type})`);
  }

  /**
   * Initialize feed-specific client
   */
  private initializeClient(config: FeedConfig): void {
    switch (config.type) {
      case 'taxii':
        if (config.config?.taxii) {
          const client = createTaxiiClient(config.config.taxii);
          this.clients.set(config.id, client);
        }
        break;

      case 'misp':
        if (config.url && config.apiKey) {
          const client = createMispClient({
            url: config.url,
            apiKey: config.apiKey,
          });
          this.clients.set(config.id, client);
        }
        break;

      case 'otx':
      case 'virustotal':
      case 'abuseipdb':
      case 'urlhaus':
      case 'threatfox':
        // These use standard HTTP clients
        break;
    }
  }

  /**
   * Start polling all enabled feeds
   */
  startPolling(callback: (iocs: IOC[], feedId: string) => void | Promise<void>): void {
    for (const [feedId, config] of this.feeds) {
      if (config.enabled) {
        this.startFeedPolling(feedId, callback);
      }
    }
  }

  /**
   * Start polling a specific feed
   */
  private startFeedPolling(
    feedId: string,
    callback: (iocs: IOC[], feedId: string) => void | Promise<void>
  ): void {
    const config = this.feeds.get(feedId);
    if (!config) return;

    const interval = config.pollInterval || 300000; // 5 minutes default

    const pollTask = async () => {
      try {
        const iocs = await this.fetchFeed(feedId);
        if (iocs.length > 0) {
          await callback(iocs, feedId);
          this.updateStats(feedId, iocs.length, 0);
        }
      } catch (error) {
        console.error(`[FEED_AGGREGATOR] Error polling feed ${config.name}:`, error);
        this.updateStats(feedId, 0, 1, (error as Error).message);
      }
    };

    // Initial poll
    this.queue.add(pollTask);

    // Set up interval
    const intervalId = setInterval(() => {
      this.queue.add(pollTask);
    }, interval);

    this.pollIntervals.set(feedId, intervalId);
  }

  /**
   * Stop polling all feeds
   */
  stopPolling(): void {
    for (const intervalId of this.pollIntervals.values()) {
      clearInterval(intervalId);
    }
    this.pollIntervals.clear();
  }

  /**
   * Fetch from a specific feed
   */
  async fetchFeed(feedId: string): Promise<IOC[]> {
    const config = this.feeds.get(feedId);
    if (!config) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    console.log(`[FEED_AGGREGATOR] Fetching from feed: ${config.name}`);

    switch (config.type) {
      case 'taxii':
        return this.fetchTaxiiFeed(feedId);
      case 'misp':
        return this.fetchMispFeed(feedId);
      case 'otx':
        return this.fetchOtxFeed(feedId);
      case 'urlhaus':
        return this.fetchUrlHausFeed(feedId);
      case 'threatfox':
        return this.fetchThreatFoxFeed(feedId);
      case 'abuseipdb':
        return this.fetchAbuseIpDbFeed(feedId);
      case 'stix':
        return this.fetchStixFeed(feedId);
      default:
        console.warn(`[FEED_AGGREGATOR] Unsupported feed type: ${config.type}`);
        return [];
    }
  }

  /**
   * Fetch from TAXII server
   */
  private async fetchTaxiiFeed(feedId: string): Promise<IOC[]> {
    const client = this.clients.get(feedId) as TaxiiClient;
    if (!client) throw new Error('TAXII client not initialized');

    const config = this.feeds.get(feedId)!;
    const collectionId = config.config?.taxii?.collectionId;

    if (!collectionId) throw new Error('TAXII collection ID not configured');

    const since = this.getLastPollTime(feedId);
    const objects = await client.poll(collectionId, since);

    // Process STIX objects
    const bundle: StixBundle = {
      type: 'bundle',
      id: `bundle--${Date.now()}`,
      objects,
    };

    return this.stixProcessor.processBundle(bundle);
  }

  /**
   * Fetch from MISP
   */
  private async fetchMispFeed(feedId: string): Promise<IOC[]> {
    const client = this.clients.get(feedId) as MispClient;
    if (!client) throw new Error('MISP client not initialized');

    const since = this.getLastPollTime(feedId);
    const events = await client.poll(since);

    return this.convertMispToIoCs(events, feedId);
  }

  /**
   * Fetch from AlienVault OTX
   */
  private async fetchOtxFeed(feedId: string): Promise<IOC[]> {
    const config = this.feeds.get(feedId)!;
    if (!config.apiKey) throw new Error('OTX API key not configured');

    const response = await axios.get('https://otx.alienvault.com/api/v1/pulses/subscribed', {
      headers: { 'X-OTX-API-KEY': config.apiKey },
      params: { limit: 50 },
    });

    const iocs: IOC[] = [];
    for (const pulse of response.data.results) {
      for (const indicator of pulse.indicators) {
        const ioc = this.convertOtxIndicator(indicator, pulse, feedId);
        if (ioc) iocs.push(ioc);
      }
    }

    return iocs;
  }

  /**
   * Fetch from URLhaus
   */
  private async fetchUrlHausFeed(feedId: string): Promise<IOC[]> {
    const response = await axios.get('https://urlhaus.abuse.ch/downloads/json_recent/');
    const data = response.data;

    const iocs: IOC[] = [];
    for (const entry of data) {
      if (entry.url) {
        iocs.push(this.createIoC(feedId, {
          type: 'url',
          value: entry.url,
          threatType: ['malware'],
          severity: 'HIGH',
          tags: entry.tags || [],
          context: {
            family: entry.threat,
            references: [{ type: 'report', url: entry.urlhaus_reference }],
          },
        }));
      }
    }

    return iocs;
  }

  /**
   * Fetch from ThreatFox
   */
  private async fetchThreatFoxFeed(feedId: string): Promise<IOC[]> {
    const response = await axios.post('https://threatfox-api.abuse.ch/api/v1/', {
      query: 'get_iocs',
      days: 1,
    });

    const iocs: IOC[] = [];
    if (response.data.query_status === 'ok') {
      for (const entry of response.data.data) {
        const type = this.mapThreatFoxType(entry.ioc_type);
        if (type) {
          iocs.push(this.createIoC(feedId, {
            type,
            value: entry.ioc,
            threatType: [entry.threat_type as ThreatType],
            severity: 'HIGH',
            tags: entry.tags || [],
            context: {
              family: entry.malware,
              references: [{ type: 'report', url: entry.reference }],
            },
          }));
        }
      }
    }

    return iocs;
  }

  /**
   * Fetch from AbuseIPDB
   */
  private async fetchAbuseIpDbFeed(feedId: string): Promise<IOC[]> {
    const config = this.feeds.get(feedId)!;
    if (!config.apiKey) throw new Error('AbuseIPDB API key not configured');

    const response = await axios.get('https://api.abuseipdb.com/api/v2/blacklist', {
      headers: { 'Key': config.apiKey },
      params: { limit: 100, confidenceMinimum: 75 },
    });

    const iocs: IOC[] = [];
    for (const entry of response.data.data) {
      iocs.push(this.createIoC(feedId, {
        type: 'ipv4',
        value: entry.ipAddress,
        threatType: ['malware'],
        severity: entry.abuseConfidenceScore >= 90 ? 'CRITICAL' : 'HIGH',
        confidenceScore: entry.abuseConfidenceScore,
        context: {
          country: entry.countryCode,
        },
      }));
    }

    return iocs;
  }

  /**
   * Fetch from STIX file/URL
   */
  private async fetchStixFeed(feedId: string): Promise<IOC[]> {
    const config = this.feeds.get(feedId)!;
    if (!config.url) throw new Error('STIX feed URL not configured');

    const response = await axios.get(config.url);
    const bundle = response.data as StixBundle;

    return this.stixProcessor.processBundle(bundle);
  }

  /**
   * Convert MISP events to IoCs
   */
  private convertMispToIoCs(events: MispEvent[], feedId: string): IOC[] {
    const iocs: IOC[] = [];

    for (const event of events) {
      for (const attr of event.Attribute) {
        if (attr.to_ids && !attr.deleted) {
          const ioc = this.convertMispAttribute(attr, event, feedId);
          if (ioc) iocs.push(ioc);
        }
      }
    }

    return iocs;
  }

  /**
   * Convert MISP attribute to IoC
   */
  private convertMispAttribute(attr: MispAttribute, event: MispEvent, feedId: string): IOC | null {
    const type = this.mapMispType(attr.type);
    if (!type) return null;

    const tags = [...(attr.Tag?.map(t => t.name) || []), ...(event.Tag?.map(t => t.name) || [])];

    return this.createIoC(feedId, {
      type,
      value: attr.value1,
      description: attr.comment || event.info,
      threatType: this.inferThreatType(attr.category, tags),
      severity: this.mapMispThreatLevel(event.threat_level_id),
      tags,
      context: {
        campaign: event.info,
        references: [{ type: 'report', title: event.info, date: event.date }],
      },
      metadata: {
        misp_event_id: event.id,
        misp_attribute_id: attr.id,
      },
    });
  }

  /**
   * Convert OTX indicator to IoC
   */
  private convertOtxIndicator(indicator: any, pulse: any, feedId: string): IOC | null {
    const type = this.mapOtxType(indicator.type);
    if (!type) return null;

    return this.createIoC(feedId, {
      type,
      value: indicator.indicator,
      description: pulse.description,
      threatType: this.inferThreatTypeFromTags(pulse.tags),
      severity: 'MEDIUM',
      tags: pulse.tags || [],
      context: {
        campaign: pulse.name,
        references: pulse.references?.map((url: string) => ({ type: 'report' as const, url })) || [],
      },
    });
  }

  /**
   * Create IoC with defaults
   */
  private createIoC(feedId: string, partial: Partial<IOC>): IOC {
    const config = this.feeds.get(feedId)!;
    const now = new Date().toISOString();

    return {
      id: `ioc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: partial.type || 'ip',
      value: partial.value || '',
      description: partial.description,
      threatType: partial.threatType || [],
      severity: partial.severity || 'MEDIUM',
      confidence: partial.confidence || 'MEDIUM',
      confidenceScore: partial.confidenceScore || 50,
      firstSeen: partial.firstSeen || now,
      lastSeen: partial.lastSeen || now,
      tags: [...(config.tags || []), ...(partial.tags || [])],
      source: config.name,
      sources: [
        {
          name: config.name,
          feedId: config.id,
          confidence: partial.confidenceScore || 50,
          firstSeen: now,
          lastSeen: now,
        },
      ],
      tlp: (config.tlpOverride as any) || partial.tlp || 'AMBER',
      isActive: true,
      falsePositive: false,
      whitelisted: false,
      context: {
        killChain: [],
        mitreTactics: [],
        mitreTechniques: [],
        references: [],
        ...partial.context,
      },
      relationships: partial.relationships || [],
      sightings: partial.sightings || [],
      enrichment: partial.enrichment || {},
      attribution: partial.attribution || {
        confidence: 'UNKNOWN',
        confidenceScore: 0,
        reasoning: [],
      },
      metadata: partial.metadata || {},
      createdBy: `feed:${feedId}`,
      createdAt: now,
      updatedAt: now,
      expiresAt: partial.expiresAt,
      ...partial,
    };
  }

  /**
   * Type mapping helpers
   */

  private mapMispType(mispType: string): IOCType | null {
    const mapping: Record<string, IOCType> = {
      'ip-src': 'ip',
      'ip-dst': 'ip',
      'domain': 'domain',
      'hostname': 'domain',
      'url': 'url',
      'email': 'email',
      'email-src': 'email',
      'email-dst': 'email',
      'md5': 'md5',
      'sha1': 'sha1',
      'sha256': 'sha256',
      'sha512': 'sha512',
      'filename|md5': 'md5',
      'filename|sha1': 'sha1',
      'filename|sha256': 'sha256',
      'mutex': 'mutex',
      'yara': 'yara_rule',
      'sigma': 'sigma_rule',
    };
    return mapping[mispType];
  }

  private mapOtxType(otxType: string): IOCType | null {
    const mapping: Record<string, IOCType> = {
      'IPv4': 'ipv4',
      'IPv6': 'ipv6',
      'domain': 'domain',
      'hostname': 'domain',
      'URL': 'url',
      'FileHash-MD5': 'md5',
      'FileHash-SHA1': 'sha1',
      'FileHash-SHA256': 'sha256',
      'email': 'email',
      'Mutex': 'mutex',
      'YARA': 'yara_rule',
    };
    return mapping[otxType];
  }

  private mapThreatFoxType(tfType: string): IOCType | null {
    const mapping: Record<string, IOCType> = {
      'ip:port': 'ip',
      'domain': 'domain',
      'url': 'url',
      'md5_hash': 'md5',
      'sha256_hash': 'sha256',
    };
    return mapping[tfType];
  }

  private mapMispThreatLevel(level: string): Severity {
    const mapping: Record<string, Severity> = {
      '1': 'HIGH',
      '2': 'MEDIUM',
      '3': 'LOW',
      '4': 'INFO',
    };
    return mapping[level] || 'MEDIUM';
  }

  private inferThreatType(category: string, tags: string[]): ThreatType[] {
    const types: ThreatType[] = [];

    if (category.includes('malware') || tags.some(t => t.includes('malware'))) {
      types.push('malware');
    }
    if (category.includes('phishing') || tags.some(t => t.includes('phishing'))) {
      types.push('phishing');
    }
    if (category.includes('ransomware') || tags.some(t => t.includes('ransomware'))) {
      types.push('ransomware');
    }
    if (tags.some(t => t.includes('apt'))) {
      types.push('apt');
    }

    return types.length > 0 ? types : ['malware'];
  }

  private inferThreatTypeFromTags(tags: string[]): ThreatType[] {
    return this.inferThreatType('', tags);
  }

  /**
   * Stats management
   */

  private updateStats(feedId: string, fetched: number, errors: number, lastError?: string): void {
    const stats = this.feedStats.get(feedId);
    if (!stats) return;

    stats.lastPoll = new Date().toISOString();
    stats.totalFetched += fetched;
    stats.totalProcessed += fetched;
    stats.totalErrors += errors;
    if (lastError) {
      stats.lastError = lastError;
      stats.status = 'error';
    } else {
      stats.status = 'active';
    }

    this.feedStats.set(feedId, stats);
  }

  private getLastPollTime(feedId: string): string {
    const stats = this.feedStats.get(feedId);
    return stats?.lastPoll || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }

  /**
   * Get feed statistics
   */
  getStats(): FeedStats[] {
    return Array.from(this.feedStats.values());
  }

  /**
   * Get specific feed stats
   */
  getFeedStats(feedId: string): FeedStats | undefined {
    return this.feedStats.get(feedId);
  }
}
