/**
 * Connector registry - manages available connectors and their metadata
 */

import { Logger } from 'winston';
import { SourceType, ConnectorCapabilities } from '@intelgraph/data-integration/src/types';

export interface ConnectorMetadata {
  id: string;
  name: string;
  type: SourceType;
  version: string;
  description: string;
  category: string;
  logo?: string;
  documentation?: string;
  capabilities: ConnectorCapabilities;
  configSchema: any;
  requiredFields: string[];
  optionalFields: string[];
  authMethods: string[];
  tags: string[];
}

export class ConnectorRegistry {
  private logger: Logger;
  private connectors: Map<string, ConnectorMetadata> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeRegistry();
  }

  /**
   * Initialize registry with available connectors
   */
  private initializeRegistry(): void {
    // Database connectors
    this.registerConnector({
      id: 'postgresql',
      name: 'PostgreSQL',
      type: SourceType.DATABASE,
      version: '1.0.0',
      description: 'Connect to PostgreSQL databases with streaming support',
      category: 'Database',
      capabilities: {
        supportsStreaming: true,
        supportsIncremental: true,
        supportsCDC: false,
        supportsSchema: true,
        supportsPartitioning: true,
        maxConcurrentConnections: 10
      },
      configSchema: {
        host: 'string',
        port: 'number',
        database: 'string',
        username: 'string',
        password: 'string',
        ssl: 'boolean'
      },
      requiredFields: ['host', 'database', 'username', 'password'],
      optionalFields: ['port', 'ssl'],
      authMethods: ['username-password'],
      tags: ['database', 'sql', 'relational']
    });

    this.registerConnector({
      id: 'mysql',
      name: 'MySQL',
      type: SourceType.DATABASE,
      version: '1.0.0',
      description: 'Connect to MySQL databases',
      category: 'Database',
      capabilities: {
        supportsStreaming: true,
        supportsIncremental: true,
        supportsCDC: true,
        supportsSchema: true,
        supportsPartitioning: true,
        maxConcurrentConnections: 100
      },
      configSchema: {
        host: 'string',
        port: 'number',
        database: 'string',
        username: 'string',
        password: 'string'
      },
      requiredFields: ['host', 'database', 'username', 'password'],
      optionalFields: ['port'],
      authMethods: ['username-password'],
      tags: ['database', 'sql', 'relational']
    });

    this.registerConnector({
      id: 'mongodb',
      name: 'MongoDB',
      type: SourceType.DATABASE,
      version: '1.0.0',
      description: 'Connect to MongoDB databases with change streams',
      category: 'Database',
      capabilities: {
        supportsStreaming: true,
        supportsIncremental: true,
        supportsCDC: true,
        supportsSchema: false,
        supportsPartitioning: true,
        maxConcurrentConnections: 100
      },
      configSchema: {
        host: 'string',
        port: 'number',
        database: 'string',
        username: 'string',
        password: 'string'
      },
      requiredFields: ['host', 'database'],
      optionalFields: ['port', 'username', 'password'],
      authMethods: ['username-password', 'connection-string'],
      tags: ['database', 'nosql', 'document']
    });

    // SaaS connectors
    this.registerConnector({
      id: 'salesforce',
      name: 'Salesforce',
      type: SourceType.SAAS,
      version: '1.0.0',
      description: 'Connect to Salesforce CRM with OAuth authentication',
      category: 'CRM',
      capabilities: {
        supportsStreaming: false,
        supportsIncremental: true,
        supportsCDC: true,
        supportsSchema: true,
        supportsPartitioning: true,
        maxConcurrentConnections: 10
      },
      configSchema: {
        clientId: 'string',
        clientSecret: 'string',
        refreshToken: 'string',
        instanceUrl: 'string'
      },
      requiredFields: ['clientId', 'clientSecret', 'refreshToken'],
      optionalFields: ['instanceUrl'],
      authMethods: ['oauth2'],
      tags: ['crm', 'saas', 'sales']
    });

    this.registerConnector({
      id: 'hubspot',
      name: 'HubSpot',
      type: SourceType.SAAS,
      version: '1.0.0',
      description: 'Connect to HubSpot CRM and Marketing Hub',
      category: 'CRM',
      capabilities: {
        supportsStreaming: false,
        supportsIncremental: true,
        supportsCDC: false,
        supportsSchema: true,
        supportsPartitioning: true,
        maxConcurrentConnections: 10
      },
      configSchema: {
        apiKey: 'string'
      },
      requiredFields: ['apiKey'],
      optionalFields: [],
      authMethods: ['api-key'],
      tags: ['crm', 'saas', 'marketing']
    });

    this.registerConnector({
      id: 'jira',
      name: 'Jira',
      type: SourceType.SAAS,
      version: '1.0.0',
      description: 'Connect to Atlassian Jira for issue tracking',
      category: 'Project Management',
      capabilities: {
        supportsStreaming: false,
        supportsIncremental: true,
        supportsCDC: false,
        supportsSchema: true,
        supportsPartitioning: true,
        maxConcurrentConnections: 5
      },
      configSchema: {
        host: 'string',
        username: 'string',
        apiToken: 'string'
      },
      requiredFields: ['host', 'username', 'apiToken'],
      optionalFields: [],
      authMethods: ['basic-auth'],
      tags: ['project-management', 'saas', 'issue-tracking']
    });

    // API connectors
    this.registerConnector({
      id: 'rest-api',
      name: 'REST API',
      type: SourceType.REST_API,
      version: '1.0.0',
      description: 'Generic REST API connector with OAuth and API key support',
      category: 'API',
      capabilities: {
        supportsStreaming: false,
        supportsIncremental: true,
        supportsCDC: false,
        supportsSchema: false,
        supportsPartitioning: true,
        maxConcurrentConnections: 10
      },
      configSchema: {
        baseUrl: 'string',
        authType: 'string',
        apiKey: 'string',
        oauth: 'object'
      },
      requiredFields: ['baseUrl'],
      optionalFields: ['authType', 'apiKey', 'oauth'],
      authMethods: ['none', 'api-key', 'oauth2', 'basic-auth'],
      tags: ['api', 'rest', 'generic']
    });

    // Cloud storage
    this.registerConnector({
      id: 's3',
      name: 'AWS S3',
      type: SourceType.CLOUD_STORAGE,
      version: '1.0.0',
      description: 'Connect to AWS S3 buckets',
      category: 'Cloud Storage',
      capabilities: {
        supportsStreaming: true,
        supportsIncremental: true,
        supportsCDC: false,
        supportsSchema: false,
        supportsPartitioning: true,
        maxConcurrentConnections: 100
      },
      configSchema: {
        accessKeyId: 'string',
        secretAccessKey: 'string',
        region: 'string',
        bucket: 'string'
      },
      requiredFields: ['accessKeyId', 'secretAccessKey', 'bucket'],
      optionalFields: ['region'],
      authMethods: ['access-key'],
      tags: ['cloud-storage', 'aws', 's3']
    });

    // Threat Intelligence
    this.registerConnector({
      id: 'stix-taxii',
      name: 'STIX/TAXII',
      type: SourceType.THREAT_INTEL,
      version: '1.0.0',
      description: 'Connect to STIX/TAXII threat intelligence feeds',
      category: 'Threat Intelligence',
      capabilities: {
        supportsStreaming: false,
        supportsIncremental: true,
        supportsCDC: false,
        supportsSchema: true,
        supportsPartitioning: false,
        maxConcurrentConnections: 5
      },
      configSchema: {
        host: 'string',
        username: 'string',
        password: 'string',
        collectionId: 'string'
      },
      requiredFields: ['host', 'collectionId'],
      optionalFields: ['username', 'password'],
      authMethods: ['none', 'basic-auth'],
      tags: ['threat-intelligence', 'stix', 'taxii']
    });

    // Streaming
    this.registerConnector({
      id: 'kafka',
      name: 'Apache Kafka',
      type: SourceType.STREAM,
      version: '1.0.0',
      description: 'Connect to Kafka topics for streaming data',
      category: 'Streaming',
      capabilities: {
        supportsStreaming: true,
        supportsIncremental: true,
        supportsCDC: true,
        supportsSchema: true,
        supportsPartitioning: true,
        maxConcurrentConnections: 100
      },
      configSchema: {
        brokers: 'array',
        topic: 'string',
        consumerGroup: 'string'
      },
      requiredFields: ['brokers', 'topic', 'consumerGroup'],
      optionalFields: [],
      authMethods: ['none', 'sasl-plain', 'sasl-scram'],
      tags: ['streaming', 'kafka', 'real-time']
    });

    this.logger.info(`Initialized connector registry with ${this.connectors.size} connectors`);
  }

  /**
   * Register a connector
   */
  private registerConnector(metadata: ConnectorMetadata): void {
    this.connectors.set(metadata.id, metadata);
    this.logger.debug(`Registered connector: ${metadata.name}`);
  }

  /**
   * List all available connectors
   */
  async listConnectors(filter?: { category?: string; type?: SourceType }): Promise<ConnectorMetadata[]> {
    let connectors = Array.from(this.connectors.values());

    if (filter?.category) {
      connectors = connectors.filter(c => c.category === filter.category);
    }

    if (filter?.type) {
      connectors = connectors.filter(c => c.type === filter.type);
    }

    return connectors;
  }

  /**
   * Get connector by ID
   */
  async getConnector(id: string): Promise<ConnectorMetadata | undefined> {
    return this.connectors.get(id);
  }

  /**
   * Search connectors
   */
  async searchConnectors(query: string): Promise<ConnectorMetadata[]> {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.connectors.values()).filter(connector =>
      connector.name.toLowerCase().includes(lowerQuery) ||
      connector.description.toLowerCase().includes(lowerQuery) ||
      connector.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get connectors by category
   */
  async getConnectorsByCategory(): Promise<Map<string, ConnectorMetadata[]>> {
    const byCategory = new Map<string, ConnectorMetadata[]>();

    for (const connector of this.connectors.values()) {
      const category = connector.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(connector);
    }

    return byCategory;
  }
}
