/**
 * REST API connector
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  BaseConnector,
  ConnectionConfig,
  ReadOptions,
  WriteOptions,
  WriteResult,
  SchemaInfo,
  DataSourceType,
} from '@intelgraph/data-integration';

/**
 * REST API connector implementation
 */
export class RestAPIConnector extends BaseConnector {
  private client?: AxiosInstance;
  private baseURL?: string;

  constructor() {
    super({
      name: 'REST API Connector',
      version: '1.0.0',
      description: 'Connector for REST APIs',
      type: DataSourceType.REST_API,
      capabilities: {
        supportsStreaming: false,
        supportsBatch: true,
        supportsIncremental: true,
        supportsCDC: false,
        supportsSchema: false,
        supportsPartitioning: false,
        supportsTransactions: false,
        maxBatchSize: 100,
      },
      configSchema: {},
    });
  }

  /**
   * Connect to REST API
   */
  async connect(config: ConnectionConfig): Promise<void> {
    this.config = config;
    this.baseURL = config.connectionString || `${config.host}:${config.port}`;

    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    };

    // Add authentication
    if (config.apiKey) {
      axiosConfig.headers!['Authorization'] = `Bearer ${config.apiKey}`;
    }

    this.client = axios.create(axiosConfig);
    this.connected = true;
    this.emit('connected');
  }

  /**
   * Disconnect from REST API
   */
  async disconnect(): Promise<void> {
    this.client = undefined;
    this.connected = false;
    this.emit('disconnected');
  }

  /**
   * Get schema information
   */
  async getSchema(tableName?: string): Promise<SchemaInfo | SchemaInfo[]> {
    // REST APIs typically don't have schema information
    return {
      name: 'api',
      type: 'api',
      fields: [],
    };
  }

  /**
   * Read data from REST API
   */
  async *read(options?: ReadOptions): AsyncIterableIterator<any> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    const endpoint = options?.filter?.endpoint || '/';
    const params = options?.filter || {};

    try {
      const response = await this.client.get(endpoint, { params });
      const data = Array.isArray(response.data) ? response.data : [response.data];

      for (const item of data) {
        yield item;
      }
    } catch (error) {
      this.emitError(error as Error);
      throw error;
    }
  }

  /**
   * Write data to REST API
   */
  async write(data: any[], options?: WriteOptions): Promise<WriteResult> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    const endpoint = options?.mode || '/';
    const startTime = Date.now();
    let recordsWritten = 0;
    let recordsFailed = 0;
    const errors: any[] = [];

    for (const record of data) {
      try {
        await this.client.post(endpoint, record);
        recordsWritten++;
      } catch (error) {
        recordsFailed++;
        errors.push({ record, error });
      }
    }

    return {
      recordsWritten,
      recordsFailed,
      errors,
      duration: Date.now() - startTime,
    };
  }
}
