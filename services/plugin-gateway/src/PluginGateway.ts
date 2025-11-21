import { createClient } from 'redis';
import { Request } from 'express';

/**
 * Plugin API Gateway with routing, transformation, and monitoring
 */
export class PluginGateway {
  private redis: any;
  private pluginCache = new Map<string, PluginInfo>();
  private metricsCollector: MetricsCollector;

  constructor() {
    this.initializeRedis();
    this.metricsCollector = new MetricsCollector();
  }

  private async initializeRedis() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    await this.redis.connect();
  }

  /**
   * Get plugin info
   */
  async getPlugin(pluginId: string): Promise<PluginInfo | null> {
    // Check cache first
    if (this.pluginCache.has(pluginId)) {
      return this.pluginCache.get(pluginId)!;
    }

    // Fetch from registry
    const cached = await this.redis.get(`plugin:${pluginId}`);
    if (cached) {
      const plugin = JSON.parse(cached);
      this.pluginCache.set(pluginId, plugin);
      return plugin;
    }

    return null;
  }

  /**
   * Check if request has permission
   */
  async checkPermission(
    pluginId: string,
    path: string,
    method: string,
    user: any
  ): Promise<boolean> {
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) return false;

    // Check if endpoint is registered
    const endpoint = plugin.manifest.apiEndpoints?.find(
      (ep: any) => ep.path === path && ep.method === method
    );

    if (!endpoint) return false;

    // Check user permissions
    if (endpoint.requiredRole && !user?.roles?.includes(endpoint.requiredRole)) {
      return false;
    }

    return true;
  }

  /**
   * Transform incoming request
   */
  async transformRequest(pluginId: string, req: Request): Promise<TransformedRequest> {
    const plugin = await this.getPlugin(pluginId);
    const transformers = plugin?.requestTransformers || [];

    let transformed: TransformedRequest = {
      method: req.method,
      path: req.path,
      headers: { ...req.headers } as Record<string, string>,
      body: req.body,
      query: req.query,
    };

    for (const transformer of transformers) {
      transformed = await this.applyTransformer(transformer, transformed);
    }

    // Add plugin context headers
    transformed.headers['x-plugin-id'] = pluginId;
    transformed.headers['x-request-id'] = this.generateRequestId();

    return transformed;
  }

  /**
   * Transform outgoing response
   */
  async transformResponse(
    pluginId: string,
    response: PluginResponse
  ): Promise<TransformedResponse> {
    const plugin = await this.getPlugin(pluginId);
    const transformers = plugin?.responseTransformers || [];

    let transformed: TransformedResponse = {
      status: response.status,
      headers: response.headers,
      body: response.body,
    };

    for (const transformer of transformers) {
      transformed = await this.applyResponseTransformer(transformer, transformed);
    }

    return transformed;
  }

  /**
   * Route request to plugin executor
   */
  async routeToPlugin(pluginId: string, request: TransformedRequest): Promise<PluginResponse> {
    const executorUrl = process.env.PLUGIN_EXECUTOR_URL || 'http://localhost:3002';
    const startTime = Date.now();

    try {
      const response = await fetch(`${executorUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
        body: JSON.stringify({
          pluginId,
          action: 'api-request',
          parameters: {
            method: request.method,
            path: request.path,
            body: request.body,
            query: request.query,
          },
        }),
      });

      const body = await response.json();

      // Record metrics
      this.metricsCollector.recordRequest(pluginId, {
        duration: Date.now() - startTime,
        status: response.status,
        success: response.ok,
      });

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body,
      };
    } catch (error) {
      this.metricsCollector.recordRequest(pluginId, {
        duration: Date.now() - startTime,
        status: 500,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    pluginId: string,
    webhookId: string,
    payload: any,
    headers: any
  ): Promise<void> {
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Verify webhook signature if configured
    const webhook = plugin.webhooks?.find((w: any) => w.id === webhookId);
    if (webhook?.secret) {
      const isValid = this.verifyWebhookSignature(payload, headers, webhook.secret);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Queue webhook for processing
    await this.redis.lpush(
      `webhook:${pluginId}:${webhookId}`,
      JSON.stringify({
        payload,
        headers,
        receivedAt: new Date().toISOString(),
      })
    );
  }

  /**
   * Get plugin API documentation
   */
  async getPluginDocs(pluginId: string): Promise<OpenAPIDoc> {
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Generate OpenAPI documentation
    return this.generateOpenAPIDocs(plugin);
  }

  /**
   * Get gateway metrics
   */
  async getMetrics(): Promise<GatewayMetrics> {
    return this.metricsCollector.getMetrics();
  }

  /**
   * Apply request transformer
   */
  private async applyTransformer(
    transformer: any,
    request: TransformedRequest
  ): Promise<TransformedRequest> {
    // Implement transformation logic
    return request;
  }

  /**
   * Apply response transformer
   */
  private async applyResponseTransformer(
    transformer: any,
    response: TransformedResponse
  ): Promise<TransformedResponse> {
    // Implement transformation logic
    return response;
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(payload: any, headers: any, secret: string): boolean {
    const signature = headers['x-webhook-signature'];
    if (!signature) return false;

    // Implement HMAC signature verification
    return true;
  }

  /**
   * Generate OpenAPI documentation
   */
  private generateOpenAPIDocs(plugin: PluginInfo): OpenAPIDoc {
    return {
      openapi: '3.0.0',
      info: {
        title: plugin.manifest.name,
        version: plugin.manifest.version,
        description: plugin.manifest.description,
      },
      paths: this.generatePaths(plugin),
    };
  }

  /**
   * Generate OpenAPI paths from plugin endpoints
   */
  private generatePaths(plugin: PluginInfo): Record<string, any> {
    const paths: Record<string, any> = {};

    for (const endpoint of plugin.manifest.apiEndpoints || []) {
      const path = `/api/plugins/${plugin.manifest.id}${endpoint.path}`;
      if (!paths[path]) {
        paths[path] = {};
      }
      paths[path][endpoint.method.toLowerCase()] = {
        summary: endpoint.description || 'No description',
        operationId: endpoint.handler,
        responses: {
          '200': { description: 'Successful response' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Internal server error' },
        },
      };
    }

    return paths;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Metrics collector for gateway
 */
class MetricsCollector {
  private metrics = new Map<string, PluginMetrics>();

  recordRequest(pluginId: string, data: RequestMetric): void {
    if (!this.metrics.has(pluginId)) {
      this.metrics.set(pluginId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalDuration: 0,
        errors: [],
      });
    }

    const m = this.metrics.get(pluginId)!;
    m.totalRequests++;
    m.totalDuration += data.duration;

    if (data.success) {
      m.successfulRequests++;
    } else {
      m.failedRequests++;
      if (data.error) {
        m.errors.push({
          message: data.error,
          timestamp: new Date(),
        });
        // Keep only last 100 errors
        if (m.errors.length > 100) {
          m.errors.shift();
        }
      }
    }
  }

  getMetrics(): GatewayMetrics {
    const plugins: Record<string, any> = {};

    for (const [pluginId, metrics] of this.metrics.entries()) {
      plugins[pluginId] = {
        ...metrics,
        avgDuration: metrics.totalRequests > 0
          ? metrics.totalDuration / metrics.totalRequests
          : 0,
        successRate: metrics.totalRequests > 0
          ? (metrics.successfulRequests / metrics.totalRequests) * 100
          : 0,
      };
    }

    return {
      totalPlugins: this.metrics.size,
      plugins,
      timestamp: new Date(),
    };
  }
}

// Types
interface PluginInfo {
  manifest: any;
  state: string;
  requestTransformers?: any[];
  responseTransformers?: any[];
  webhooks?: any[];
}

interface TransformedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: any;
  query: any;
}

interface TransformedResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

interface PluginResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

interface RequestMetric {
  duration: number;
  status: number;
  success: boolean;
  error?: string;
}

interface PluginMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  errors: Array<{ message: string; timestamp: Date }>;
}

interface GatewayMetrics {
  totalPlugins: number;
  plugins: Record<string, any>;
  timestamp: Date;
}

interface OpenAPIDoc {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, any>;
}
