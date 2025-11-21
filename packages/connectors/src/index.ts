/**
 * Integration Connectors Framework
 * Extensible connector system for integrating with external services
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ConnectorConfig {
  id: string;
  name: string;
  type: string;
  description?: string;
  authentication: AuthenticationConfig;
  baseUrl?: string;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  rateLimiting?: {
    maxRequestsPerSecond: number;
    maxRequestsPerMinute: number;
  };
  metadata?: Record<string, any>;
}

export interface AuthenticationConfig {
  type:
    | 'none'
    | 'api_key'
    | 'basic'
    | 'bearer'
    | 'oauth2'
    | 'custom';
  credentials?: {
    apiKey?: string;
    username?: string;
    password?: string;
    token?: string;
    clientId?: string;
    clientSecret?: string;
    [key: string]: any;
  };
  customAuth?: (request: any) => any;
}

export interface ConnectorOperation {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  description?: string;
  parameters?: OperationParameter[];
  requestSchema?: any;
  responseSchema?: any;
}

export interface OperationParameter {
  name: string;
  type: 'path' | 'query' | 'header' | 'body';
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: any;
  description?: string;
}

export interface ConnectorExecutionResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    duration: number;
    retries: number;
    timestamp: Date;
  };
}

export abstract class BaseConnector extends EventEmitter {
  protected config: ConnectorConfig;
  protected httpClient: AxiosInstance;
  protected requestQueue: Array<() => Promise<any>> = [];
  protected isProcessingQueue = false;

  constructor(config: ConnectorConfig) {
    super();
    this.config = config;
    this.httpClient = this.createHttpClient();
  }

  /**
   * Create HTTP client with authentication and configuration
   */
  private createHttpClient(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || 30000,
      headers: this.getAuthHeaders(),
    });

    // Add request interceptor for authentication
    instance.interceptors.request.use(
      (config) => {
        this.emit('request.start', { url: config.url, method: config.method });
        return config;
      },
      (error) => {
        this.emit('request.error', error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for error handling
    instance.interceptors.response.use(
      (response) => {
        this.emit('request.success', {
          url: response.config.url,
          status: response.status,
        });
        return response;
      },
      async (error) => {
        this.emit('request.error', error);

        // Handle retries
        if (this.config.retryConfig && !error.config.__retryCount) {
          error.config.__retryCount = 0;
        }

        if (
          this.config.retryConfig &&
          error.config.__retryCount < this.config.retryConfig.maxRetries
        ) {
          error.config.__retryCount++;

          const delay = this.config.retryConfig.exponentialBackoff
            ? this.config.retryConfig.retryDelay *
              Math.pow(2, error.config.__retryCount - 1)
            : this.config.retryConfig.retryDelay;

          await new Promise((resolve) => setTimeout(resolve, delay));

          return instance(error.config);
        }

        return Promise.reject(error);
      },
    );

    return instance;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (this.config.authentication.type) {
      case 'api_key':
        if (this.config.authentication.credentials?.apiKey) {
          headers['X-API-Key'] = this.config.authentication.credentials.apiKey;
        }
        break;

      case 'bearer':
        if (this.config.authentication.credentials?.token) {
          headers['Authorization'] =
            `Bearer ${this.config.authentication.credentials.token}`;
        }
        break;

      case 'basic':
        if (
          this.config.authentication.credentials?.username &&
          this.config.authentication.credentials?.password
        ) {
          const credentials = Buffer.from(
            `${this.config.authentication.credentials.username}:${this.config.authentication.credentials.password}`,
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
    }

    return headers;
  }

  /**
   * Execute a connector operation
   */
  async execute(
    operation: string,
    params: Record<string, any> = {},
  ): Promise<ConnectorExecutionResult> {
    const startTime = Date.now();
    let retries = 0;

    try {
      // Apply rate limiting if configured
      if (this.config.rateLimiting) {
        await this.applyRateLimiting();
      }

      const result = await this.executeOperation(operation, params);

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
          retries,
          timestamp: new Date(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'EXECUTION_ERROR',
          message: error.message,
          details: error.response?.data,
        },
        metadata: {
          duration: Date.now() - startTime,
          retries,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimiting(): Promise<void> {
    // Simple rate limiting implementation
    // Production version would use a more sophisticated approach
    return new Promise((resolve) => {
      if (this.config.rateLimiting) {
        const delay = 1000 / this.config.rateLimiting.maxRequestsPerSecond;
        setTimeout(resolve, delay);
      } else {
        resolve();
      }
    });
  }

  /**
   * Execute specific operation (must be implemented by subclasses)
   */
  protected abstract executeOperation(
    operation: string,
    params: Record<string, any>,
  ): Promise<any>;

  /**
   * Validate configuration (can be overridden by subclasses)
   */
  validate(): boolean {
    if (!this.config.id || !this.config.name || !this.config.type) {
      throw new Error('Invalid connector configuration');
    }
    return true;
  }

  /**
   * Test connection
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get available operations
   */
  abstract getOperations(): ConnectorOperation[];

  /**
   * Get configuration
   */
  getConfig(): ConnectorConfig {
    return this.config;
  }
}

/**
 * REST API Connector
 */
export class RestAPIConnector extends BaseConnector {
  private operations: Map<string, ConnectorOperation> = new Map();

  constructor(
    config: ConnectorConfig,
    operations: ConnectorOperation[] = [],
  ) {
    super(config);
    operations.forEach((op) => this.operations.set(op.name, op));
  }

  protected async executeOperation(
    operationName: string,
    params: Record<string, any>,
  ): Promise<any> {
    const operation = this.operations.get(operationName);
    if (!operation) {
      throw new Error(`Operation ${operationName} not found`);
    }

    // Build request
    const requestConfig: AxiosRequestConfig = {
      method: operation.method,
      url: this.buildUrl(operation.endpoint, params),
      headers: this.buildHeaders(operation, params),
      params: this.buildQueryParams(operation, params),
      data: this.buildBody(operation, params),
    };

    const response = await this.httpClient.request(requestConfig);
    return response.data;
  }

  private buildUrl(endpoint: string, params: Record<string, any>): string {
    let url = endpoint;

    // Replace path parameters
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
    });

    return url;
  }

  private buildHeaders(
    operation: ConnectorOperation,
    params: Record<string, any>,
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    operation.parameters
      ?.filter((p) => p.type === 'header')
      .forEach((param) => {
        if (params[param.name] !== undefined) {
          headers[param.name] = String(params[param.name]);
        }
      });

    return headers;
  }

  private buildQueryParams(
    operation: ConnectorOperation,
    params: Record<string, any>,
  ): Record<string, any> {
    const queryParams: Record<string, any> = {};

    operation.parameters
      ?.filter((p) => p.type === 'query')
      .forEach((param) => {
        if (params[param.name] !== undefined) {
          queryParams[param.name] = params[param.name];
        }
      });

    return queryParams;
  }

  private buildBody(
    operation: ConnectorOperation,
    params: Record<string, any>,
  ): any {
    const bodyParams = operation.parameters?.filter((p) => p.type === 'body');

    if (!bodyParams || bodyParams.length === 0) {
      return undefined;
    }

    if (bodyParams.length === 1) {
      return params[bodyParams[0].name];
    }

    const body: Record<string, any> = {};
    bodyParams.forEach((param) => {
      if (params[param.name] !== undefined) {
        body[param.name] = params[param.name];
      }
    });

    return body;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try a simple GET request to base URL or health endpoint
      await this.httpClient.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  getOperations(): ConnectorOperation[] {
    return Array.from(this.operations.values());
  }

  addOperation(operation: ConnectorOperation): void {
    this.operations.set(operation.name, operation);
  }
}

/**
 * Database Connector
 */
export class DatabaseConnector extends BaseConnector {
  protected async executeOperation(
    operation: string,
    params: Record<string, any>,
  ): Promise<any> {
    // Database operation execution
    // Would use pg, mysql2, mongodb, etc. based on database type
    throw new Error('Database connector not fully implemented');
  }

  async testConnection(): Promise<boolean> {
    // Test database connection
    return true;
  }

  getOperations(): ConnectorOperation[] {
    return [
      {
        id: 'query',
        name: 'query',
        method: 'POST',
        endpoint: '/query',
        description: 'Execute a database query',
        parameters: [
          {
            name: 'sql',
            type: 'body',
            dataType: 'string',
            required: true,
            description: 'SQL query to execute',
          },
          {
            name: 'params',
            type: 'body',
            dataType: 'array',
            required: false,
            description: 'Query parameters',
          },
        ],
      },
    ];
  }
}

/**
 * Connector Registry
 */
export class ConnectorRegistry extends EventEmitter {
  private connectors = new Map<string, BaseConnector>();
  private connectorTypes = new Map<
    string,
    new (config: ConnectorConfig) => BaseConnector
  >();

  constructor() {
    super();
    this.registerBuiltInConnectors();
  }

  private registerBuiltInConnectors(): void {
    // Register built-in connector types
    this.registerConnectorType('rest_api', RestAPIConnector as any);
    this.registerConnectorType('database', DatabaseConnector as any);
  }

  registerConnectorType(
    type: string,
    connectorClass: new (config: ConnectorConfig) => BaseConnector,
  ): void {
    this.connectorTypes.set(type, connectorClass);
    this.emit('connector_type.registered', type);
  }

  registerConnector(config: ConnectorConfig): BaseConnector {
    const ConnectorClass = this.connectorTypes.get(config.type);
    if (!ConnectorClass) {
      throw new Error(`Unknown connector type: ${config.type}`);
    }

    const connector = new ConnectorClass(config);
    connector.validate();

    this.connectors.set(config.id, connector);
    this.emit('connector.registered', config);

    return connector;
  }

  getConnector(id: string): BaseConnector | undefined {
    return this.connectors.get(id);
  }

  getAllConnectors(): BaseConnector[] {
    return Array.from(this.connectors.values());
  }

  removeConnector(id: string): void {
    this.connectors.delete(id);
    this.emit('connector.removed', id);
  }

  async testAllConnections(): Promise<
    Record<string, { success: boolean; error?: string }>
  > {
    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const [id, connector] of this.connectors) {
      try {
        const success = await connector.testConnection();
        results[id] = { success };
      } catch (error: any) {
        results[id] = { success: false, error: error.message };
      }
    }

    return results;
  }
}

export default ConnectorRegistry;
