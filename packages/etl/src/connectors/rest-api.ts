import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { BaseConnector, ConnectorMetadata } from './base.js';
import type { ConnectorConfig } from '../types.js';

/**
 * REST API Connector Configuration
 */
export interface RestApiConfig {
  baseUrl: string;
  endpoints?: string[];
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pagination?: {
    type: 'offset' | 'cursor' | 'page' | 'none';
    limitParam?: string;
    offsetParam?: string;
    pageParam?: string;
    cursorParam?: string;
    pageSize?: number;
    totalPagesHeader?: string;
    nextPageHeader?: string;
    dataPath?: string; // JSONPath to extract data array
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    retryOn: number[]; // HTTP status codes to retry
  };
}

/**
 * REST API Connector
 * Supports OAuth/API key authentication, pagination, and rate limiting
 */
export class RestApiConnector extends BaseConnector {
  private client: AxiosInstance;
  private apiConfig: RestApiConfig;

  constructor(config: ConnectorConfig) {
    super(config);
    this.apiConfig = config.config as RestApiConfig;

    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: this.apiConfig.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...this.apiConfig.headers,
        ...this.getAuthHeaders(config.auth)
      }
    });

    // Add retry interceptor
    this.setupRetryInterceptor();
  }

  /**
   * Setup retry interceptor for failed requests
   */
  private setupRetryInterceptor(): void {
    const retryConfig = this.apiConfig.retryConfig || {
      maxRetries: 3,
      retryDelay: 1000,
      retryOn: [429, 500, 502, 503, 504]
    };

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as AxiosRequestConfig & { retryCount?: number };

        if (!config || !config.retryCount) {
          config.retryCount = 0;
        }

        const shouldRetry =
          error.response &&
          retryConfig.retryOn.includes(error.response.status) &&
          config.retryCount < retryConfig.maxRetries;

        if (shouldRetry) {
          config.retryCount++;
          const delay = retryConfig.retryDelay * Math.pow(2, config.retryCount - 1);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.client.request(config);
        }

        return Promise.reject(error);
      }
    );
  }

  async connect(): Promise<void> {
    try {
      // Test connection
      await this.test();
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
      const endpoint = this.apiConfig.endpoints?.[0] || '/';
      await this.withRateLimit(() =>
        this.client.get(endpoint, { timeout: 5000 })
      );
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

    const endpoints = this.apiConfig.endpoints || ['/'];

    for (const endpoint of endpoints) {
      if (this.apiConfig.pagination && this.apiConfig.pagination.type !== 'none') {
        yield* this.fetchPaginated(endpoint, options);
      } else {
        yield* this.fetchSingle(endpoint, options);
      }
    }

    this.finish();
  }

  /**
   * Fetch data from a single endpoint without pagination
   */
  private async *fetchSingle(
    endpoint: string,
    options?: Record<string, unknown>
  ): AsyncGenerator<unknown, void, unknown> {
    try {
      const response = await this.withRateLimit(() =>
        this.client.request({
          url: endpoint,
          method: this.apiConfig.method || 'GET',
          params: { ...this.apiConfig.params, ...options },
          data: this.apiConfig.body
        })
      );

      const data = this.extractData(response.data);

      if (Array.isArray(data)) {
        for (const record of data) {
          yield record;
          this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
        }
      } else {
        yield data;
        this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Fetch data with pagination support
   */
  private async *fetchPaginated(
    endpoint: string,
    options?: Record<string, unknown>
  ): AsyncGenerator<unknown, void, unknown> {
    const pagination = this.apiConfig.pagination!;
    let hasMore = true;
    let offset = 0;
    let page = 1;
    let cursor: string | undefined;

    while (hasMore) {
      try {
        const params: Record<string, unknown> = {
          ...this.apiConfig.params,
          ...options
        };

        // Add pagination parameters
        switch (pagination.type) {
          case 'offset':
            params[pagination.limitParam || 'limit'] = pagination.pageSize || 100;
            params[pagination.offsetParam || 'offset'] = offset;
            break;
          case 'page':
            params[pagination.pageParam || 'page'] = page;
            params[pagination.limitParam || 'limit'] = pagination.pageSize || 100;
            break;
          case 'cursor':
            if (cursor) {
              params[pagination.cursorParam || 'cursor'] = cursor;
            }
            params[pagination.limitParam || 'limit'] = pagination.pageSize || 100;
            break;
        }

        const response = await this.withRateLimit(() =>
          this.client.request({
            url: endpoint,
            method: this.apiConfig.method || 'GET',
            params,
            data: this.apiConfig.body
          })
        );

        const data = this.extractData(response.data);
        const records = Array.isArray(data) ? data : [data];

        if (records.length === 0) {
          hasMore = false;
          break;
        }

        for (const record of records) {
          yield record;
          this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
        }

        // Update pagination state
        switch (pagination.type) {
          case 'offset':
            offset += records.length;
            hasMore = records.length === pagination.pageSize;
            break;
          case 'page':
            page++;
            const totalPages = pagination.totalPagesHeader
              ? parseInt(response.headers[pagination.totalPagesHeader], 10)
              : Infinity;
            hasMore = page <= totalPages && records.length === pagination.pageSize;
            break;
          case 'cursor':
            const nextPage = pagination.nextPageHeader
              ? response.headers[pagination.nextPageHeader]
              : response.data.nextCursor;
            cursor = nextPage;
            hasMore = !!cursor;
            break;
        }
      } catch (error) {
        this.handleError(error as Error);
        throw error;
      }
    }
  }

  /**
   * Extract data from response using JSONPath if configured
   */
  private extractData(data: any): unknown[] | unknown {
    if (!this.apiConfig.pagination?.dataPath) {
      return data;
    }

    // Simple JSONPath implementation for common cases
    const path = this.apiConfig.pagination.dataPath.split('.');
    let result = data;

    for (const key of path) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return data; // Fallback to original data
      }
    }

    return result;
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'REST API Connector',
      type: 'REST_API',
      version: '1.0.0',
      description: 'Connects to REST APIs with OAuth/API key support and pagination',
      capabilities: [
        'authentication',
        'pagination',
        'rate_limiting',
        'retry',
        'bulk_fetch'
      ],
      requiredConfig: ['baseUrl']
    };
  }
}
