import { createPlugin, PluginPermission } from '@summit/plugin-sdk';
import { BaseDataSourceExtension, DataSourceQuery, DataSourceResult } from '@summit/extension-api';

/**
 * Example data source plugin that connects to a REST API
 */
class RestAPIDataSource extends BaseDataSourceExtension {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: any) {
    super('rest-api-datasource', config);
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async connect(): Promise<void> {
    // Test connection to API
    const response = await fetch(`${this.baseUrl}/health`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to connect to API');
    }
  }

  async disconnect(): Promise<void> {
    // Cleanup if needed
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch {
      return false;
    }
  }

  async execute(query: DataSourceQuery): Promise<DataSourceResult> {
    const url = new URL(`${this.baseUrl}${query.query}`);

    // Add query parameters
    if (query.parameters) {
      Object.entries(query.parameters).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Add pagination
    if (query.limit) {
      url.searchParams.append('limit', String(query.limit));
    }
    if (query.offset) {
      url.searchParams.append('offset', String(query.offset));
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      data: Array.isArray(data) ? data : [data],
      total: data.total || data.length,
      hasMore: data.hasMore || false,
    };
  }
}

export default createPlugin()
  .withMetadata({
    id: 'rest-api-datasource',
    name: 'REST API Data Source',
    version: '1.0.0',
    description: 'Connect to any REST API as a data source',
    author: {
      name: 'Summit Team',
      email: 'team@summit.dev',
    },
    license: 'MIT',
    category: 'data-source',
  })
  .requiresEngine('>=1.0.0')
  .withMain('./dist/index.js')
  .requestPermissions(
    PluginPermission.NETWORK_ACCESS,
    PluginPermission.READ_DATA
  )
  .withResources({
    maxMemoryMB: 128,
    maxCpuPercent: 30,
    maxStorageMB: 50,
    maxNetworkMbps: 10,
  })
  .onInitialize(async (context) => {
    context.logger.info('Initializing REST API data source...');

    // Validate configuration
    if (!context.config.baseUrl) {
      throw new Error('baseUrl is required in configuration');
    }
    if (!context.config.apiKey) {
      throw new Error('apiKey is required in configuration');
    }

    // Store data source instance
    const dataSource = new RestAPIDataSource(context.config);
    await context.storage.set('datasource', dataSource);

    context.logger.info('REST API data source initialized');
  })
  .onStart(async () => {
    console.log('REST API data source started');
  })
  .onStop(async () => {
    console.log('REST API data source stopped');
  })
  .withHealthCheck(async () => {
    return {
      healthy: true,
      message: 'REST API data source is operational',
    };
  })
  .build();
