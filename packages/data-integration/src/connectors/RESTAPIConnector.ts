/**
 * REST API connector with authentication support
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { BaseConnector } from '../core/BaseConnector';
import { ConnectorCapabilities, DataSourceConfig } from '../types';
import { Logger } from 'winston';

export class RESTAPIConnector extends BaseConnector {
  private client: AxiosInstance | null = null;
  private accessToken: string | null = null;

  constructor(config: DataSourceConfig, logger: Logger) {
    super(config, logger);
    this.validateConfig();
  }

  async connect(): Promise<void> {
    try {
      // Initialize axios client
      this.client = axios.create({
        baseURL: this.config.connectionConfig.host,
        timeout: this.config.connectionConfig.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'IntelGraph-DataIntegration/1.0'
        }
      });

      // Setup authentication
      await this.setupAuthentication();

      this.isConnected = true;
      this.logger.info(`Connected to REST API: ${this.config.connectionConfig.host}`);
    } catch (error) {
      this.logger.error('Failed to connect to REST API', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.accessToken = null;
    this.isConnected = false;
    this.logger.info('Disconnected from REST API');
  }

  async testConnection(): Promise<boolean> {
    try {
      const healthEndpoint = this.config.metadata.healthEndpoint || '/health';
      await this.client!.get(healthEndpoint);
      return true;
    } catch (error) {
      this.logger.error('Connection test failed', { error });
      return false;
    }
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      supportsStreaming: false,
      supportsIncremental: true,
      supportsCDC: false,
      supportsSchema: false,
      supportsPartitioning: true,
      maxConcurrentConnections: 10
    };
  }

  async *extract(): AsyncGenerator<any[], void, unknown> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to REST API');
    }

    const endpoint = this.config.extractionConfig.query || this.config.metadata.endpoint;
    const paginationConfig = this.config.extractionConfig.paginationConfig;

    this.logger.info(`Extracting data from REST API endpoint: ${endpoint}`);

    if (!paginationConfig) {
      // Single request without pagination
      const data = await this.fetchPage(endpoint);
      yield [data];
      return;
    }

    // Handle pagination
    switch (paginationConfig.type) {
      case 'offset':
        yield* this.extractWithOffsetPagination(endpoint, paginationConfig);
        break;
      case 'cursor':
        yield* this.extractWithCursorPagination(endpoint, paginationConfig);
        break;
      case 'page':
        yield* this.extractWithPagePagination(endpoint, paginationConfig);
        break;
    }
  }

  async getSchema(): Promise<any> {
    // REST APIs typically don't have a formal schema
    // Could implement OpenAPI/Swagger schema parsing
    return {
      type: 'rest_api',
      endpoint: this.config.metadata.endpoint,
      schema: 'dynamic'
    };
  }

  private async setupAuthentication(): Promise<void> {
    const { apiKey, oauth } = this.config.connectionConfig;

    if (apiKey) {
      // API Key authentication
      this.client!.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
      this.logger.info('Using API Key authentication');
    } else if (oauth) {
      // OAuth 2.0 authentication
      await this.refreshOAuthToken();
      this.logger.info('Using OAuth 2.0 authentication');
    }
  }

  private async refreshOAuthToken(): Promise<void> {
    const oauth = this.config.connectionConfig.oauth!;

    try {
      const response = await axios.post(oauth.tokenUrl, {
        grant_type: 'refresh_token',
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        refresh_token: oauth.refreshToken,
        scope: oauth.scope?.join(' ')
      });

      this.accessToken = response.data.access_token;
      this.client!.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

      this.logger.info('OAuth token refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh OAuth token', { error });
      throw error;
    }
  }

  private async fetchPage(url: string, params?: any): Promise<any> {
    return await this.withRetry(async () => {
      await this.rateLimit();

      const response = await this.client!.get(url, { params });
      return response.data;
    }, 'Fetch page');
  }

  private async *extractWithOffsetPagination(
    endpoint: string,
    config: any
  ): AsyncGenerator<any[], void, unknown> {
    let offset = 0;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && (!config.maxPages || pageCount < config.maxPages)) {
      const params = {
        limit: config.pageSize,
        offset: offset
      };

      const data = await this.fetchPage(endpoint, params);
      const items = Array.isArray(data) ? data : data.items || data.results || [];

      if (items.length === 0) {
        hasMore = false;
      } else {
        yield items;
        offset += items.length;
        pageCount++;
      }
    }
  }

  private async *extractWithCursorPagination(
    endpoint: string,
    config: any
  ): AsyncGenerator<any[], void, unknown> {
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && (!config.maxPages || pageCount < config.maxPages)) {
      const params: any = {
        limit: config.pageSize
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const data = await this.fetchPage(endpoint, params);
      const items = Array.isArray(data) ? data : data.items || data.results || [];
      cursor = data.next_cursor || data.nextCursor || null;

      if (items.length === 0 || !cursor) {
        hasMore = false;
      }

      if (items.length > 0) {
        yield items;
        pageCount++;
      }
    }
  }

  private async *extractWithPagePagination(
    endpoint: string,
    config: any
  ): AsyncGenerator<any[], void, unknown> {
    let page = 1;
    let hasMore = true;

    while (hasMore && (!config.maxPages || page <= config.maxPages)) {
      const params = {
        page: page,
        per_page: config.pageSize
      };

      const data = await this.fetchPage(endpoint, params);
      const items = Array.isArray(data) ? data : data.items || data.results || [];

      if (items.length === 0) {
        hasMore = false;
      } else {
        yield items;
        page++;
      }
    }
  }
}
