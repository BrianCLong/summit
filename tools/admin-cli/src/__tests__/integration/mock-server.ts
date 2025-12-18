/**
 * Mock API Server for Integration Tests
 * Simulates the IntelGraph Admin API
 */

import http from 'node:http';
import { URL } from 'node:url';

interface MockResponse {
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
}

type RouteHandler = (
  req: http.IncomingMessage,
  body: unknown
) => MockResponse | Promise<MockResponse>;

/**
 * Mock API Server
 */
export class MockApiServer {
  private server: http.Server | null = null;
  private routes: Map<string, Map<string, RouteHandler>> = new Map();
  private port: number = 0;

  /**
   * Register a route handler
   */
  route(method: string, path: string, handler: RouteHandler): this {
    const methodUpper = method.toUpperCase();
    if (!this.routes.has(methodUpper)) {
      this.routes.set(methodUpper, new Map());
    }
    this.routes.get(methodUpper)!.set(path, handler);
    return this;
  }

  /**
   * GET route helper
   */
  get(path: string, handler: RouteHandler): this {
    return this.route('GET', path, handler);
  }

  /**
   * POST route helper
   */
  post(path: string, handler: RouteHandler): this {
    return this.route('POST', path, handler);
  }

  /**
   * PUT route helper
   */
  put(path: string, handler: RouteHandler): this {
    return this.route('PUT', path, handler);
  }

  /**
   * DELETE route helper
   */
  delete(path: string, handler: RouteHandler): this {
    return this.route('DELETE', path, handler);
  }

  /**
   * Start the server
   */
  async start(port: number = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });

      this.server.listen(port, () => {
        const addr = this.server!.address();
        this.port = typeof addr === 'object' && addr ? addr.port : port;
        resolve(this.port);
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server URL
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Handle incoming request
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', `http://localhost:${this.port}`);
    const path = url.pathname;

    // Parse request body
    const body = await this.parseBody(req);

    // Find route handler
    const methodRoutes = this.routes.get(method);
    let handler: RouteHandler | undefined;

    if (methodRoutes) {
      // Try exact match first
      handler = methodRoutes.get(path);

      // Try pattern matching
      if (!handler) {
        for (const [pattern, h] of methodRoutes) {
          if (this.matchPattern(pattern, path)) {
            handler = h;
            break;
          }
        }
      }
    }

    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found', path, method }));
      return;
    }

    // Execute handler
    const response = await handler(req, body);

    // Send response
    res.writeHead(response.status ?? 200, {
      'Content-Type': 'application/json',
      ...response.headers,
    });
    res.end(JSON.stringify(response.body));
  }

  /**
   * Parse request body
   */
  private parseBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];

      req.on('data', (chunk) => chunks.push(chunk));

      req.on('end', () => {
        if (chunks.length === 0) {
          resolve(null);
          return;
        }

        const body = Buffer.concat(chunks).toString('utf8');
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });

      req.on('error', () => resolve(null));
    });
  }

  /**
   * Match route pattern (supports :param style)
   */
  private matchPattern(pattern: string, path: string): boolean {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        continue; // Parameter placeholder matches anything
      }
      if (patternParts[i] !== pathParts[i]) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Create a pre-configured mock server with common routes
 */
export function createMockAdminServer(): MockApiServer {
  const server = new MockApiServer();

  // Health endpoints
  server.get('/health', () => ({
    body: { status: 'healthy' },
  }));

  server.get('/health/ready', () => ({
    body: { status: 'ready' },
  }));

  server.get('/health/detailed', () => ({
    body: {
      services: [
        { name: 'api', status: 'healthy', latency: 45, lastChecked: new Date().toISOString() },
        { name: 'postgres', status: 'healthy', latency: 12, lastChecked: new Date().toISOString() },
        { name: 'neo4j', status: 'healthy', latency: 18, lastChecked: new Date().toISOString() },
        { name: 'redis', status: 'healthy', latency: 3, lastChecked: new Date().toISOString() },
      ],
    },
  }));

  // Metrics
  server.get('/metrics/slo', () => ({
    body: {
      availability: 0.9995,
      errorRate: 0.0005,
      p99Latency: 245,
      throughput: 2500,
    },
  }));

  // Tenants
  server.get('/admin/tenants', () => ({
    body: {
      items: [
        { id: 'default', name: 'Default', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
        { id: 'enterprise', name: 'Enterprise', status: 'active', createdAt: '2024-01-15T00:00:00Z' },
      ],
    },
  }));

  server.get('/admin/tenants/:id', () => ({
    body: {
      id: 'default',
      name: 'Default',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  }));

  server.post('/admin/tenants', (_req, body) => ({
    status: 201,
    body: {
      id: 'new-tenant-' + Date.now(),
      ...(body as object),
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  }));

  // Users
  server.get('/admin/users', () => ({
    body: {
      items: [
        { id: 'u1', email: 'admin@example.com', role: 'admin', tenantId: 'default' },
        { id: 'u2', email: 'analyst@example.com', role: 'analyst', tenantId: 'default' },
      ],
    },
  }));

  // Audit
  server.get('/admin/audit', () => ({
    body: {
      items: [
        { ts: new Date().toISOString(), action: 'auth.success', user: { email: 'admin@example.com' } },
        { ts: new Date().toISOString(), action: 'entity.create', user: { email: 'analyst@example.com' } },
      ],
    },
  }));

  server.post('/admin/audit/record', () => ({
    status: 201,
    body: { ok: true },
  }));

  // Security
  server.get('/admin/security/keys', () => ({
    body: {
      items: [
        { id: 'key-jwt-1', type: 'jwt', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
        { id: 'key-api-1', type: 'api', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
      ],
    },
  }));

  server.post('/admin/security/rotate-keys', () => ({
    body: {
      rotatedKeys: [
        { id: 'key-jwt-new', type: 'jwt', status: 'active' },
      ],
    },
  }));

  server.post('/admin/security/check-policies', () => ({
    body: {
      results: [
        { policy: 'password-policy', compliant: true, violations: [] },
        { policy: 'data-retention', compliant: true, violations: [] },
      ],
    },
  }));

  // Graph
  server.get('/admin/graph/stats', () => ({
    body: {
      nodeCount: 1000000,
      edgeCount: 4000000,
      labelCounts: { Entity: 800000, Person: 200000 },
      relationshipCounts: { CONNECTED_TO: 2000000 },
      storageSize: 8589934592,
      cacheHitRate: 0.92,
    },
  }));

  server.get('/admin/graph/health', () => ({
    body: {
      status: 'healthy',
      latency: 15,
      version: '5.24.0',
    },
  }));

  // Data operations
  server.post('/admin/data/backfill', () => ({
    body: {
      operationId: 'op-' + Date.now(),
      type: 'backfill',
      status: 'running',
      startedAt: new Date().toISOString(),
    },
  }));

  server.post('/admin/data/reindex', () => ({
    body: {
      operationId: 'op-' + Date.now(),
      type: 'reindex',
      status: 'running',
      startedAt: new Date().toISOString(),
    },
  }));

  server.get('/admin/data/operations', () => ({
    body: {
      items: [
        { operationId: 'op-1', type: 'backfill', status: 'completed', progress: 1 },
        { operationId: 'op-2', type: 'reindex', status: 'running', progress: 0.5 },
      ],
    },
  }));

  return server;
}
