import axios, { AxiosInstance } from 'axios';
import { BaseConnector, ConnectorMetadata } from './base.js';
import type { ConnectorConfig } from '../types.js';
import * as dns from 'dns/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * NewsAPI Connector
 * Connects to NewsAPI.org for news aggregation
 */
export class NewsApiConnector extends BaseConnector {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: ConnectorConfig) {
    super(config);
    const connectorConfig = config.config as { apiKey: string; query?: string; sources?: string; language?: string; from?: string; to?: string };
    this.apiKey = connectorConfig.apiKey;

    this.client = axios.create({
      baseURL: 'https://newsapi.org/v2',
      timeout: 30000,
      headers: {
        'X-Api-Key': this.apiKey
      }
    });
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }

  async test(): Promise<boolean> {
    try {
      await this.client.get('/top-headlines', {
        params: { country: 'us', pageSize: 1 }
      });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<unknown, void, unknown> {
    if (!this.connected) {
      await this.connect();
    }

    const config = this.config.config as any;
    let page = 1;
    const pageSize = 100;

    while (true) {
      try {
        const response = await this.withRateLimit(() =>
          this.client.get('/everything', {
            params: {
              q: config.query || options?.query || 'intelligence',
              sources: config.sources || options?.sources,
              language: config.language || options?.language || 'en',
              from: config.from || options?.from,
              to: config.to || options?.to,
              sortBy: 'publishedAt',
              page,
              pageSize
            }
          })
        );

        const articles = response.data.articles || [];

        if (articles.length === 0) {
          break;
        }

        for (const article of articles) {
          yield {
            ...article,
            _source: 'newsapi',
            _fetchedAt: new Date()
          };
          this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
        }

        if (articles.length < pageSize) {
          break;
        }

        page++;
      } catch (error) {
        this.handleError(error as Error);
        break;
      }
    }

    this.finish();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'NewsAPI Connector',
      type: 'NEWS_API',
      version: '1.0.0',
      description: 'Aggregates news from NewsAPI.org',
      capabilities: ['news_aggregation', 'search', 'filtering', 'pagination'],
      requiredConfig: ['apiKey']
    };
  }
}

/**
 * GDELT Connector
 * Connects to GDELT Project for global event data
 */
export class GdeltConnector extends BaseConnector {
  private client: AxiosInstance;

  constructor(config: ConnectorConfig) {
    super(config);

    this.client = axios.create({
      baseURL: 'https://api.gdeltproject.org/api/v2',
      timeout: 60000
    });
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }

  async test(): Promise<boolean> {
    try {
      await this.client.get('/doc/doc', {
        params: {
          query: 'test',
          mode: 'artlist',
          maxrecords: 1,
          format: 'json'
        }
      });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<unknown, void, unknown> {
    if (!this.connected) {
      await this.connect();
    }

    const config = this.config.config as any;
    const query = config.query || options?.query || 'intelligence';
    const maxRecords = config.maxRecords || options?.maxRecords || 250;

    try {
      const response = await this.withRateLimit(() =>
        this.client.get('/doc/doc', {
          params: {
            query,
            mode: 'artlist',
            maxrecords: maxRecords,
            format: 'json',
            timespan: config.timespan || options?.timespan
          }
        })
      );

      const articles = response.data.articles || [];

      for (const article of articles) {
        yield {
          ...article,
          _source: 'gdelt',
          _fetchedAt: new Date()
        };
        this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
      }
    } catch (error) {
      this.handleError(error as Error);
    }

    this.finish();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'GDELT Connector',
      type: 'GDELT',
      version: '1.0.0',
      description: 'Ingests global event data from GDELT Project',
      capabilities: ['event_data', 'news_monitoring', 'geospatial'],
      requiredConfig: []
    };
  }
}

/**
 * Reddit Connector
 * Connects to Reddit API for social media intelligence
 */
export class RedditConnector extends BaseConnector {
  private client: AxiosInstance;
  private accessToken?: string;

  constructor(config: ConnectorConfig) {
    super(config);

    this.client = axios.create({
      baseURL: 'https://oauth.reddit.com',
      timeout: 30000
    });
  }

  async connect(): Promise<void> {
    const config = this.config.config as any;

    try {
      // Get OAuth token
      const authResponse = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        {
          auth: {
            username: config.clientId,
            password: config.clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = authResponse.data.access_token;

      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
      this.client.defaults.headers.common['User-Agent'] = config.userAgent || 'IntelGraphBot/1.0';

      this.connected = true;
      this.emit('connected');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.accessToken = undefined;
    this.connected = false;
    this.emit('disconnected');
  }

  async test(): Promise<boolean> {
    try {
      await this.connect();
      await this.client.get('/r/all/hot', {
        params: { limit: 1 }
      });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<unknown, void, unknown> {
    if (!this.connected) {
      await this.connect();
    }

    const config = this.config.config as any;
    const subreddits = config.subreddits || options?.subreddits || ['all'];
    const limit = config.limit || options?.limit || 100;
    const sort = config.sort || options?.sort || 'hot';

    for (const subreddit of subreddits) {
      let after: string | undefined;

      while (true) {
        try {
          const response = await this.withRateLimit(() =>
            this.client.get(`/r/${subreddit}/${sort}`, {
              params: {
                limit: Math.min(limit, 100),
                after
              }
            })
          );

          const posts = response.data.data.children || [];

          if (posts.length === 0) {
            break;
          }

          for (const post of posts) {
            yield {
              ...post.data,
              _source: 'reddit',
              _subreddit: subreddit,
              _fetchedAt: new Date()
            };
            this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
          }

          after = response.data.data.after;

          if (!after) {
            break;
          }
        } catch (error) {
          this.handleError(error as Error);
          break;
        }
      }
    }

    this.finish();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Reddit Connector',
      type: 'REDDIT',
      version: '1.0.0',
      description: 'Ingests posts and comments from Reddit',
      capabilities: ['social_media', 'oauth', 'pagination', 'multi_subreddit'],
      requiredConfig: ['clientId', 'clientSecret']
    };
  }
}

/**
 * WHOIS Connector
 * Performs WHOIS lookups for domain enrichment
 */
export class WhoisConnector extends BaseConnector {
  constructor(config: ConnectorConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }

  async test(): Promise<boolean> {
    try {
      await this.lookupDomain('example.com');
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<unknown, void, unknown> {
    if (!this.connected) {
      await this.connect();
    }

    const config = this.config.config as any;
    const domains = config.domains || options?.domains || [];

    for (const domain of domains) {
      try {
        const whoisData = await this.withRateLimit(() => this.lookupDomain(domain));

        yield {
          domain,
          whois: whoisData,
          _source: 'whois',
          _fetchedAt: new Date()
        };

        this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
      } catch (error) {
        this.handleError(error as Error);
        this.emit('lookup-error', { domain, error });
      }
    }

    this.finish();
  }

  private async lookupDomain(domain: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`whois ${domain}`);
      return stdout;
    } catch (error) {
      throw new Error(`WHOIS lookup failed for ${domain}: ${error}`);
    }
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'WHOIS Connector',
      type: 'WHOIS',
      version: '1.0.0',
      description: 'Performs WHOIS lookups for domain enrichment',
      capabilities: ['domain_enrichment', 'bulk_lookup'],
      requiredConfig: ['domains']
    };
  }
}

/**
 * DNS Connector
 * Performs DNS lookups for IP and domain enrichment
 */
export class DnsConnector extends BaseConnector {
  constructor(config: ConnectorConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }

  async test(): Promise<boolean> {
    try {
      await dns.resolve('example.com');
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<unknown, void, unknown> {
    if (!this.connected) {
      await this.connect();
    }

    const config = this.config.config as any;
    const domains = config.domains || options?.domains || [];
    const recordTypes = config.recordTypes || options?.recordTypes || ['A', 'AAAA', 'MX', 'TXT'];

    for (const domain of domains) {
      try {
        const dnsData: Record<string, unknown> = {
          domain,
          _source: 'dns',
          _fetchedAt: new Date()
        };

        for (const recordType of recordTypes) {
          try {
            let records;

            switch (recordType) {
              case 'A':
                records = await this.withRateLimit(() => dns.resolve4(domain));
                break;
              case 'AAAA':
                records = await this.withRateLimit(() => dns.resolve6(domain));
                break;
              case 'MX':
                records = await this.withRateLimit(() => dns.resolveMx(domain));
                break;
              case 'TXT':
                records = await this.withRateLimit(() => dns.resolveTxt(domain));
                break;
              case 'NS':
                records = await this.withRateLimit(() => dns.resolveNs(domain));
                break;
              case 'CNAME':
                records = await this.withRateLimit(() => dns.resolveCname(domain));
                break;
              default:
                continue;
            }

            dnsData[recordType] = records;
          } catch (error) {
            // Record type not found, continue
          }
        }

        yield dnsData;
        this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
      } catch (error) {
        this.handleError(error as Error);
        this.emit('lookup-error', { domain, error });
      }
    }

    this.finish();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'DNS Connector',
      type: 'DNS',
      version: '1.0.0',
      description: 'Performs DNS lookups for domain and IP enrichment',
      capabilities: ['dns_lookup', 'multi_record_types', 'bulk_lookup'],
      requiredConfig: ['domains']
    };
  }
}

/**
 * MISP Connector
 * Connects to MISP (Malware Information Sharing Platform) for threat intelligence
 */
export class MispConnector extends BaseConnector {
  private client: AxiosInstance;

  constructor(config: ConnectorConfig) {
    super(config);
    const mispConfig = config.config as any;

    this.client = axios.create({
      baseURL: mispConfig.url,
      timeout: 30000,
      headers: {
        'Authorization': mispConfig.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.get('/servers/getVersion');
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
      await this.client.get('/servers/getVersion');
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<unknown, void, unknown> {
    if (!this.connected) {
      await this.connect();
    }

    const config = this.config.config as any;
    const page = config.page || options?.page || 1;
    const limit = config.limit || options?.limit || 100;

    try {
      const response = await this.withRateLimit(() =>
        this.client.post('/events/restSearch', {
          page,
          limit,
          returnFormat: 'json',
          published: config.publishedOnly ?? true,
          timestamp: config.timestamp || options?.timestamp
        })
      );

      const events = response.data.response || [];

      for (const event of events) {
        yield {
          ...event,
          _source: 'misp',
          _fetchedAt: new Date()
        };
        this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
      }
    } catch (error) {
      this.handleError(error as Error);
    }

    this.finish();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'MISP Connector',
      type: 'MISP',
      version: '1.0.0',
      description: 'Ingests threat intelligence from MISP platform',
      capabilities: ['threat_intel', 'event_search', 'filtering'],
      requiredConfig: ['url', 'apiKey']
    };
  }
}
