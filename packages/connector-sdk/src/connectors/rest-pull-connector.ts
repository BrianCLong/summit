/**
 * REST Pull Connector
 *
 * Polls REST APIs with configurable pagination and authentication.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { PullConnector } from '../base-connector';
import type {
  ConnectorManifest,
  ConnectorConfig,
  ConnectorContext,
  ConnectorResult,
  ConnectorEntity,
  AuthMethod,
} from '../types';

export interface RestPullConnectorConfig {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  authMethod?: AuthMethod;
  pagination?: {
    type: 'offset' | 'cursor' | 'page';
    limitParam?: string;
    offsetParam?: string;
    cursorParam?: string;
    pageParam?: string;
    pageSize?: number;
    maxPages?: number;
  };
  responseDataPath?: string; // JSONPath to array of records
  entityType?: string;
  rateLimitDelay?: number; // ms between requests
}

/**
 * REST Pull Connector
 */
export class RestPullConnector extends PullConnector {
  readonly manifest: ConnectorManifest = {
    id: 'rest-pull-connector',
    name: 'REST API Pull Connector',
    version: '1.0.0',
    description: 'Polls REST APIs with pagination support',
    status: 'stable',
    category: 'api',
    capabilities: ['pull', 'incremental'],
    entityTypes: ['GenericRecord'],
    relationshipTypes: [],
    authentication: ['none', 'basic', 'api-key', 'bearer'],
    requiredSecrets: [],
    license: 'MIT',
    maintainer: 'IntelGraph Team',
    documentationUrl: 'https://docs.intelgraph.io/connectors/rest-pull',
    tags: ['rest', 'api', 'http', 'polling'],
    rateLimit: {
      requestsPerMinute: 60,
      burstLimit: 10,
    },
    configSchema: {
      type: 'object',
      properties: {
        baseUrl: { type: 'string' },
        path: { type: 'string' },
        method: { type: 'string', enum: ['GET', 'POST'], default: 'GET' },
        headers: { type: 'object' },
        queryParams: { type: 'object' },
        authMethod: { type: 'string', enum: ['none', 'basic', 'api-key', 'bearer'] },
        pagination: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['offset', 'cursor', 'page'] },
            pageSize: { type: 'number', default: 100 },
            maxPages: { type: 'number' },
          },
        },
        responseDataPath: { type: 'string', default: 'data' },
        entityType: { type: 'string', default: 'GenericRecord' },
      },
      required: ['baseUrl', 'path'],
    },
  };

  private restConfig!: RestPullConnectorConfig;
  private httpClient!: AxiosInstance;

  protected async onInitialize(config: ConnectorConfig): Promise<void> {
    this.restConfig = config.config as RestPullConnectorConfig;

    // Validate configuration
    if (!this.restConfig.baseUrl || !this.restConfig.path) {
      throw new Error('baseUrl and path are required');
    }

    // Create HTTP client
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.restConfig.baseUrl,
      headers: this.restConfig.headers || {},
      timeout: 30000,
    };

    // Add authentication
    if (this.restConfig.authMethod === 'basic' && config.secrets.username && config.secrets.password) {
      axiosConfig.auth = {
        username: config.secrets.username,
        password: config.secrets.password,
      };
    } else if (this.restConfig.authMethod === 'bearer' && config.secrets.token) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        Authorization: `Bearer ${config.secrets.token}`,
      };
    } else if (this.restConfig.authMethod === 'api-key' && config.secrets.apiKey) {
      const apiKeyHeader = config.secrets.apiKeyHeader || 'X-API-Key';
      axiosConfig.headers = {
        ...axiosConfig.headers,
        [apiKeyHeader]: config.secrets.apiKey,
      };
    }

    this.httpClient = axios.create(axiosConfig);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.httpClient.request({
        method: this.restConfig.method || 'GET',
        url: this.restConfig.path,
        params: {
          ...this.restConfig.queryParams,
          // Limit to 1 record for test
          [this.restConfig.pagination?.limitParam || 'limit']: 1,
        },
      });

      return {
        success: response.status >= 200 && response.status < 300,
        message: `Successfully connected to ${this.restConfig.baseUrl}${this.restConfig.path}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect: ${(error as Error).message}`,
      };
    }
  }

  async pull(context: ConnectorContext): Promise<ConnectorResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    let entitiesProcessed = 0;
    const errors: any[] = [];

    try {
      const {
        path,
        method = 'GET',
        queryParams = {},
        pagination,
        responseDataPath = 'data',
        entityType = 'GenericRecord',
        rateLimitDelay = 0,
      } = this.restConfig;

      context.logger.info('Starting REST API ingestion', {
        baseUrl: this.restConfig.baseUrl,
        path,
        method,
        pagination,
      });

      // Load cursor from state if available
      let cursor = await context.stateStore.getCursor();
      let hasMore = true;
      let page = 1;
      let offset = 0;

      while (hasMore) {
        this.checkAborted(context.signal);

        // Check pagination limits
        if (pagination?.maxPages && page > pagination.maxPages) {
          context.logger.info('Reached max pages limit', { maxPages: pagination.maxPages });
          break;
        }

        // Rate limiting
        await context.rateLimiter.acquire();

        // Additional delay if configured
        if (rateLimitDelay > 0 && page > 1) {
          await new Promise((resolve) => setTimeout(resolve, rateLimitDelay));
        }

        // Build request params
        const params: Record<string, any> = { ...queryParams };

        if (pagination) {
          const { type, limitParam = 'limit', offsetParam = 'offset', cursorParam = 'cursor', pageParam = 'page', pageSize = 100 } = pagination;

          if (type === 'offset') {
            params[limitParam] = pageSize;
            params[offsetParam] = offset;
          } else if (type === 'cursor' && cursor) {
            params[cursorParam] = cursor;
            params[limitParam] = pageSize;
          } else if (type === 'page') {
            params[pageParam] = page;
            params[limitParam] = pageSize;
          }
        }

        try {
          const response = await this.httpClient.request({
            method,
            url: path,
            params,
          });

          // Extract data from response
          const data = this.extractData(response.data, responseDataPath);

          if (!Array.isArray(data)) {
            throw new Error(`Response data is not an array. Path: ${responseDataPath}`);
          }

          context.logger.debug('Received records from API', {
            count: data.length,
            page,
            offset,
          });

          // Process records
          for (const record of data) {
            try {
              const entity: ConnectorEntity = {
                type: entityType,
                externalId: this.generateExternalId(
                  path,
                  record.id || `record_${entitiesProcessed + 1}`
                ),
                props: record,
                confidence: 1.0,
                observedAt: new Date(),
                sourceMeta: {
                  apiPath: path,
                  page,
                  offset,
                },
              };

              await context.emitter.emitEntity(entity);
              entitiesProcessed++;

              context.metrics.increment('rest.records.processed', 1, {
                connector: this.manifest.id,
              });
            } catch (error) {
              context.logger.error('Error processing API record', error as Error, {
                page,
                recordIndex: entitiesProcessed,
              });

              errors.push({
                code: 'RECORD_PROCESSING_ERROR',
                message: (error as Error).message,
                recordId: `page_${page}_record_${entitiesProcessed}`,
                retryable: false,
              });
            }
          }

          // Update pagination state
          if (data.length < (pagination?.pageSize || 100)) {
            hasMore = false;
          } else {
            if (pagination?.type === 'offset') {
              offset += data.length;
            } else if (pagination?.type === 'cursor') {
              // Extract next cursor from response
              cursor = this.extractCursor(response.data);
              if (!cursor) {
                hasMore = false;
              } else {
                await context.stateStore.setCursor(cursor);
              }
            } else if (pagination?.type === 'page') {
              page++;
            }
          }
        } catch (error) {
          context.logger.error('Error fetching from API', error as Error, {
            page,
            offset,
          });

          errors.push({
            code: 'API_REQUEST_ERROR',
            message: (error as Error).message,
            retryable: true,
            cause: error as Error,
          });

          hasMore = false;
        }
      }

      await context.emitter.flush();

      const durationMs = Date.now() - startTime;
      context.logger.info('REST API ingestion completed', {
        entitiesProcessed,
        errorCount: errors.length,
        durationMs,
        pagesProcessed: page,
      });

      context.metrics.timing('rest.ingestion.duration', durationMs, {
        connector: this.manifest.id,
      });

      return {
        success: errors.length === 0,
        entitiesProcessed,
        relationshipsProcessed: 0,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        cursor: cursor || undefined,
        durationMs,
        metadata: {
          pagesProcessed: page,
          lastOffset: offset,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      context.logger.error('REST API ingestion failed', error as Error);

      return this.failureResult(error as Error, entitiesProcessed, 0, durationMs);
    }
  }

  /**
   * Extract data array from response using JSONPath-like syntax
   */
  private extractData(responseData: any, path: string): any {
    const parts = path.split('.');
    let current = responseData;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        throw new Error(`Cannot find path "${path}" in response`);
      }
    }

    return current;
  }

  /**
   * Extract next cursor from response (looks for common cursor field names)
   */
  private extractCursor(responseData: any): string | null {
    const cursorFields = ['next_cursor', 'nextCursor', 'cursor', 'next', 'pagination.next'];

    for (const field of cursorFields) {
      const cursor = this.extractData(responseData, field);
      if (cursor && typeof cursor === 'string') {
        return cursor;
      }
    }

    return null;
  }
}
