import {
  ConnectorExtension,
  ConnectionConfig,
  ConnectionTestResult,
  FetchRequest,
  FetchResult,
  ConnectorMetadata,
  DataSchema,
  Entity,
  PluginContext,
} from '@summit/plugin-system';

/**
 * Threat Intelligence Connector Plugin
 *
 * Connects to external threat intelligence feeds:
 * - MISP (Malware Information Sharing Platform)
 * - STIX/TAXII feeds
 * - Commercial threat feeds
 * - Open source intelligence (OSINT)
 */
export default class ThreatIntelConnectorPlugin extends ConnectorExtension {
  private connectionConfig?: ConnectionConfig;
  private rateLimitRemaining = 1000;
  private lastFetchTime?: Date;

  protected async onInitialize(context: PluginContext): Promise<void> {
    await super.onInitialize(context);
    this.log.info('Threat Intelligence Connector initialized');

    // Load connection config from context
    if (context.config.connection) {
      this.connectionConfig = context.config.connection;
    }
  }

  protected async onStart(): Promise<void> {
    await super.onStart();
    this.log.info('Threat Intelligence Connector started');

    // Test connection on start
    if (this.connectionConfig) {
      const testResult = await this.testConnection(this.connectionConfig);
      if (!testResult.success) {
        this.log.warn('Connection test failed', { error: testResult.error });
      } else {
        this.log.info('Connection test successful', { latency: testResult.latencyMs });
      }
    }
  }

  protected async onStop(): Promise<void> {
    await super.onStop();
    this.log.info('Threat Intelligence Connector stopped');
  }

  protected async onDestroy(): Promise<void> {
    await super.onDestroy();
  }

  /**
   * Test connection to threat intel feed
   */
  async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      this.log.info('Testing connection', { endpoint: config.endpoint });

      // Build request
      const url = config.endpoint || 'https://api.threatintel.example.com/v1/status';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication
      if (config.auth) {
        if (config.auth.type === 'bearer' && config.auth.credentials?.token) {
          headers['Authorization'] = `Bearer ${config.auth.credentials.token}`;
        } else if (config.auth.type === 'apikey' && config.auth.credentials?.key) {
          headers['X-API-Key'] = config.auth.credentials.key;
        }
      }

      // Make request
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(config.timeout || 5000),
      });

      if (!response.ok) {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
          error: await response.text(),
        };
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      return {
        success: true,
        message: 'Connection successful',
        latencyMs: latency,
        metadata: {
          version: data.version,
          capabilities: data.capabilities || [],
          limits: {
            rateLimit: data.rateLimit || 1000,
            maxResults: data.maxResults || 100,
          },
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        message: 'Connection failed',
        latencyMs: latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch threat intelligence data
   */
  async fetch(request: FetchRequest): Promise<FetchResult> {
    const startTime = Date.now();

    try {
      this.log.info('Fetching threat intelligence', {
        query: request.query,
        limit: request.pagination?.limit,
      });

      // Check rate limiting
      if (this.rateLimitRemaining <= 0) {
        throw new Error('Rate limit exceeded');
      }

      // Fetch data from API
      const data = await this.fetchFromAPI(request);

      // Transform to entities and relationships
      const entities = this.transformToEntities(data.indicators);
      const relationships = this.extractRelationships(data.indicators);

      // Update rate limit
      this.rateLimitRemaining--;
      this.lastFetchTime = new Date();

      const executionTime = Date.now() - startTime;

      return {
        entities,
        relationships,
        pagination: {
          total: data.total || entities.length,
          hasMore: data.hasMore || false,
          nextCursor: data.nextCursor,
        },
        metadata: {
          fetchedAt: new Date(),
          source: 'threat-intel-feed',
          executionTimeMs: executionTime,
          fromCache: false,
        },
        warnings: data.warnings,
      };
    } catch (error) {
      this.log.error('Failed to fetch threat intelligence', error as Error);
      throw error;
    }
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata {
    return {
      name: 'Threat Intelligence Connector',
      description: 'Connects to external threat intelligence feeds for indicator enrichment',
      version: '1.0.0',
      author: 'IntelGraph Team',
      category: 'threat-intelligence',
      icon: 'https://example.com/icons/threat-intel.svg',
      tags: ['threat-intelligence', 'osint', 'misp', 'stix'],
      connectorType: 'pull',
      protocols: ['https', 'stix/taxii'],
      authMethods: ['apikey', 'bearer', 'oauth'],
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerDay: 10000,
        concurrentRequests: 5,
      },
      providesDataTypes: ['indicator', 'malware', 'threat-actor', 'campaign'],
      configSchema: {
        type: 'object',
        required: ['apiKey', 'feedUrl'],
        properties: {
          apiKey: {
            type: 'string',
            description: 'API key for authentication',
          },
          feedUrl: {
            type: 'string',
            description: 'Threat intelligence feed URL',
          },
          feedType: {
            type: 'string',
            enum: ['misp', 'stix', 'custom'],
            default: 'stix',
          },
          refreshInterval: {
            type: 'number',
            description: 'Refresh interval in minutes',
            default: 60,
          },
          indicatorTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['ip', 'domain', 'hash', 'url', 'email'],
            },
            default: ['ip', 'domain', 'hash'],
          },
        },
      },
      setupInstructions: `
1. Obtain API key from your threat intelligence provider
2. Configure the feed URL in plugin settings
3. Select indicator types to import
4. Set refresh interval
5. Test connection and enable plugin
      `.trim(),
      documentation: 'https://docs.intelgraph.io/plugins/threat-intel-connector',
    };
  }

  /**
   * Get data schema
   */
  async getSchema(): Promise<DataSchema> {
    return {
      version: '1.0.0',
      updatedAt: new Date(),
      entityTypes: [
        {
          type: 'Indicator',
          label: 'Threat Indicator',
          description: 'Indicator of compromise (IoC)',
          identifierProperty: 'value',
          properties: [
            {
              name: 'value',
              type: 'string',
              description: 'Indicator value (IP, domain, hash, etc.)',
              required: true,
              indexed: true,
            },
            {
              name: 'type',
              type: 'string',
              description: 'Indicator type',
              required: true,
              indexed: true,
            },
            {
              name: 'confidence',
              type: 'number',
              description: 'Confidence score (0-100)',
              required: false,
            },
            {
              name: 'firstSeen',
              type: 'date',
              description: 'First seen timestamp',
              required: false,
              indexed: true,
            },
            {
              name: 'lastSeen',
              type: 'date',
              description: 'Last seen timestamp',
              required: false,
              indexed: true,
            },
            {
              name: 'tags',
              type: 'array',
              description: 'Associated tags',
              required: false,
            },
          ],
        },
        {
          type: 'ThreatActor',
          label: 'Threat Actor',
          description: 'Known threat actor or group',
          identifierProperty: 'name',
          properties: [
            {
              name: 'name',
              type: 'string',
              description: 'Actor name',
              required: true,
              unique: true,
            },
            {
              name: 'aliases',
              type: 'array',
              description: 'Known aliases',
              required: false,
            },
            {
              name: 'sophistication',
              type: 'string',
              description: 'Sophistication level',
              required: false,
            },
          ],
        },
        {
          type: 'Malware',
          label: 'Malware',
          description: 'Malware family or variant',
          identifierProperty: 'name',
          properties: [
            {
              name: 'name',
              type: 'string',
              description: 'Malware name',
              required: true,
            },
            {
              name: 'family',
              type: 'string',
              description: 'Malware family',
              required: false,
            },
            {
              name: 'type',
              type: 'string',
              description: 'Malware type (ransomware, trojan, etc.)',
              required: false,
            },
          ],
        },
      ],
      relationshipTypes: [
        {
          type: 'INDICATES',
          label: 'Indicates',
          description: 'Indicator points to a threat',
          directed: true,
          sourceTypes: ['Indicator'],
          targetTypes: ['Malware', 'ThreatActor', 'Campaign'],
          properties: [
            {
              name: 'confidence',
              type: 'number',
              description: 'Confidence of association',
              required: false,
            },
          ],
        },
        {
          type: 'USES',
          label: 'Uses',
          description: 'Actor uses malware',
          directed: true,
          sourceTypes: ['ThreatActor'],
          targetTypes: ['Malware'],
          properties: [],
        },
      ],
    };
  }

  /**
   * Fetch data from API
   */
  private async fetchFromAPI(request: FetchRequest): Promise<ThreatIntelData> {
    if (!this.connectionConfig) {
      throw new Error('Connection not configured');
    }

    const url = new URL(this.connectionConfig.endpoint || 'https://api.threatintel.example.com/v1/indicators');

    // Add query parameters
    if (request.query && typeof request.query === 'string') {
      url.searchParams.set('q', request.query);
    }

    if (request.pagination) {
      url.searchParams.set('limit', String(request.pagination.limit));
      url.searchParams.set('offset', String(request.pagination.offset));
      if (request.pagination.cursor) {
        url.searchParams.set('cursor', request.pagination.cursor);
      }
    }

    // Add filters
    if (request.filters) {
      request.filters.forEach(filter => {
        url.searchParams.set(`filter[${filter.field}]`, String(filter.value));
      });
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.connectionConfig.auth?.type === 'apikey' && this.connectionConfig.auth.credentials?.key) {
      headers['X-API-Key'] = this.connectionConfig.auth.credentials.key;
    }

    // Make request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.connectionConfig.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Transform API data to entities
   */
  private transformToEntities(indicators: ThreatIndicator[]): Entity[] {
    return indicators.map(indicator => ({
      id: `indicator-${indicator.value}`,
      type: 'Indicator',
      properties: {
        value: indicator.value,
        type: indicator.type,
        confidence: indicator.confidence,
        firstSeen: indicator.firstSeen,
        lastSeen: indicator.lastSeen,
        tags: indicator.tags,
        severity: indicator.severity,
        description: indicator.description,
      },
    }));
  }

  /**
   * Extract relationships from indicators
   */
  private extractRelationships(indicators: ThreatIndicator[]): any[] {
    const relationships: any[] = [];

    for (const indicator of indicators) {
      if (indicator.relatedActors) {
        indicator.relatedActors.forEach(actor => {
          relationships.push({
            id: `rel-${indicator.value}-${actor}`,
            type: 'INDICATES',
            source: `indicator-${indicator.value}`,
            target: `actor-${actor}`,
            properties: {
              confidence: indicator.confidence,
            },
          });
        });
      }

      if (indicator.relatedMalware) {
        indicator.relatedMalware.forEach(malware => {
          relationships.push({
            id: `rel-${indicator.value}-${malware}`,
            type: 'INDICATES',
            source: `indicator-${indicator.value}`,
            target: `malware-${malware}`,
            properties: {
              confidence: indicator.confidence,
            },
          });
        });
      }
    }

    return relationships;
  }
}

interface ThreatIntelData {
  indicators: ThreatIndicator[];
  total?: number;
  hasMore?: boolean;
  nextCursor?: string;
  warnings?: string[];
}

interface ThreatIndicator {
  value: string;
  type: string;
  confidence: number;
  firstSeen?: string;
  lastSeen?: string;
  tags?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  relatedActors?: string[];
  relatedMalware?: string[];
}
