/**
 * Redis Cluster Client with Connection Pooling and Failover
 *
 * Provides a resilient Redis client with:
 * - Connection pooling with configurable min/max connections
 * - Automatic failover between primary and replica nodes
 * - Sentinel support for high availability
 * - Health checking and circuit breaker patterns
 * - Air-gapped environment fallback support
 *
 * Trade-offs:
 * - Memory overhead from connection pooling (mitigated by idle timeout)
 * - Slight latency increase for health checks (configurable interval)
 * - Complexity vs. single connection (justified for production resilience)
 */

import Redis, { Cluster, RedisOptions } from 'ioredis';
import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import {
  RedisClusterConfig,
  RedisNodeConfig,
  ConnectionState,
  ConnectionPoolStats,
  FailoverEvent,
  FailoverReason,
  FailoverMode,
} from './types.js';

interface PooledConnection {
  id: string;
  client: Redis;
  node: RedisNodeConfig;
  state: ConnectionState;
  lastUsed: Date;
  errorCount: number;
  created: Date;
}

interface NodeHealth {
  node: RedisNodeConfig;
  healthy: boolean;
  latency: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

export class RedisClusterClient extends EventEmitter {
  private config: Required<RedisClusterConfig>;
  private pool: Map<string, PooledConnection> = new Map();
  private nodeHealth: Map<string, NodeHealth> = new Map();
  private activeNode: RedisNodeConfig | null = null;
  private failoverInProgress = false;
  private failoverHistory: FailoverEvent[] = [];
  private healthCheckTimer?: NodeJS.Timeout;
  private idleCheckTimer?: NodeJS.Timeout;
  private waitQueue: Array<{
    resolve: (conn: PooledConnection) => void;
    reject: (err: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  private readonly MAX_HISTORY = 100;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;

  constructor(config: RedisClusterConfig) {
    super();
    this.config = this.normalizeConfig(config);
    this.initializeNodeHealth();
  }

  private normalizeConfig(config: RedisClusterConfig): Required<RedisClusterConfig> {
    return {
      nodes: config.nodes,
      sentinels: config.sentinels ?? [],
      masterName: config.masterName ?? 'mymaster',
      password: config.password ?? '',
      db: config.db ?? 0,
      poolSize: config.poolSize ?? 10,
      minPoolSize: config.minPoolSize ?? 2,
      maxPoolSize: config.maxPoolSize ?? 50,
      acquireTimeout: config.acquireTimeout ?? 5000,
      idleTimeout: config.idleTimeout ?? 60000,
      failoverMode: config.failoverMode ?? 'automatic',
      failoverTimeout: config.failoverTimeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      healthCheckInterval: config.healthCheckInterval ?? 10000,
      airgapMode: config.airgapMode ?? false,
      localFallbackPath: config.localFallbackPath ?? '/tmp/redis-fallback',
    };
  }

  private initializeNodeHealth(): void {
    for (const node of this.config.nodes) {
      const nodeKey = this.getNodeKey(node);
      this.nodeHealth.set(nodeKey, {
        node,
        healthy: false,
        latency: Infinity,
        lastCheck: new Date(0),
        consecutiveFailures: 0,
      });
    }
  }

  /**
   * Initialize the connection pool and start health monitoring
   */
  async initialize(): Promise<void> {
    // Find and connect to primary node
    const primary = await this.findPrimaryNode();
    if (!primary) {
      throw new Error('No healthy primary node found');
    }

    this.activeNode = primary;

    // Create minimum pool connections
    await this.ensureMinPoolSize();

    // Start health monitoring
    this.startHealthChecking();
    this.startIdleConnectionCleanup();

    this.emit('initialized', { activeNode: this.activeNode });
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<Redis> {
    // Try to get an idle connection first
    const idleConn = this.getIdleConnection();
    if (idleConn) {
      idleConn.state = 'connected';
      idleConn.lastUsed = new Date();
      return idleConn.client;
    }

    // Check if we can create a new connection
    if (this.pool.size < this.config.maxPoolSize) {
      const conn = await this.createConnection();
      return conn.client;
    }

    // Wait for a connection to become available
    return this.waitForConnection();
  }

  /**
   * Release a connection back to the pool
   */
  release(client: Redis): void {
    for (const [id, conn] of this.pool.entries()) {
      if (conn.client === client) {
        conn.state = 'connected';
        conn.lastUsed = new Date();

        // Fulfill waiting requests
        if (this.waitQueue.length > 0) {
          const waiter = this.waitQueue.shift()!;
          clearTimeout(waiter.timeout);
          conn.state = 'connected';
          waiter.resolve(conn);
        }

        return;
      }
    }
  }

  /**
   * Execute a command with automatic failover
   */
  async execute<T>(
    command: string,
    ...args: unknown[]
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const client = await this.acquire();
        try {
          const result = await (client as any)[command](...args);
          this.release(client);
          return result as T;
        } catch (error) {
          this.release(client);
          throw error;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if failover is needed
        if (this.shouldTriggerFailover(lastError)) {
          await this.handleFailover(lastError);
        }

        // Wait before retry
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError ?? new Error('Command execution failed');
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(): ConnectionPoolStats {
    let active = 0;
    let idle = 0;

    for (const conn of this.pool.values()) {
      if (conn.state === 'connected') {
        idle++;
      } else {
        active++;
      }
    }

    const healthyNodes = Array.from(this.nodeHealth.values())
      .filter(h => h.healthy).length;

    return {
      total: this.pool.size,
      active,
      idle,
      waiting: this.waitQueue.length,
      created: this.pool.size,
      destroyed: 0, // Track separately if needed
      healthyNodes,
      unhealthyNodes: this.nodeHealth.size - healthyNodes,
    };
  }

  /**
   * Get current active node
   */
  getActiveNode(): RedisNodeConfig | null {
    return this.activeNode;
  }

  /**
   * Get health status of all nodes
   */
  getNodeHealthStatus(): Map<string, NodeHealth> {
    return new Map(this.nodeHealth);
  }

  /**
   * Get failover history
   */
  getFailoverHistory(): FailoverEvent[] {
    return [...this.failoverHistory];
  }

  /**
   * Manually trigger failover
   */
  async manualFailover(targetNode?: RedisNodeConfig): Promise<void> {
    if (this.config.failoverMode === 'manual' || this.config.failoverMode === 'airgap-safe') {
      await this.performFailover('manual-trigger', targetNode);
    } else {
      throw new Error('Manual failover not allowed in automatic mode');
    }
  }

  /**
   * Check if client is in air-gapped mode
   */
  isAirgapped(): boolean {
    return this.config.airgapMode && !this.activeNode;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
    }

    // Reject waiting requests
    for (const waiter of this.waitQueue) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Client shutting down'));
    }
    this.waitQueue = [];

    // Close all connections
    const closePromises: Promise<void>[] = [];
    for (const conn of this.pool.values()) {
      closePromises.push(
        conn.client.quit().catch(() => conn.client.disconnect()),
      );
    }
    await Promise.allSettled(closePromises);

    this.pool.clear();
    this.emit('shutdown');
  }

  // Private methods

  private async findPrimaryNode(): Promise<RedisNodeConfig | null> {
    // If using sentinels, query them first
    if (this.config.sentinels.length > 0) {
      return this.findPrimaryViaSentinel();
    }

    // Otherwise, check nodes directly
    const primaryNodes = this.config.nodes.filter(n => n.role === 'primary');
    for (const node of primaryNodes) {
      const healthy = await this.checkNodeHealth(node);
      if (healthy) {
        return node;
      }
    }

    // Fall back to any healthy node
    for (const node of this.config.nodes) {
      const healthy = await this.checkNodeHealth(node);
      if (healthy) {
        return node;
      }
    }

    return null;
  }

  private async findPrimaryViaSentinel(): Promise<RedisNodeConfig | null> {
    for (const sentinel of this.config.sentinels) {
      try {
        const client = new Redis({
          host: sentinel.host,
          port: sentinel.port,
          password: this.config.password,
          connectTimeout: 5000,
        });

        const result = await client.sentinel('get-master-addr-by-name', this.config.masterName);
        await client.quit();

        if (result && Array.isArray(result)) {
          const [host, port] = result;
          return {
            host: String(host),
            port: parseInt(String(port), 10),
            role: 'primary',
          };
        }
      } catch (error) {
        // Try next sentinel
        continue;
      }
    }

    return null;
  }

  private async checkNodeHealth(node: RedisNodeConfig): Promise<boolean> {
    const nodeKey = this.getNodeKey(node);
    const startTime = Date.now();

    try {
      const client = new Redis({
        host: node.host,
        port: node.port,
        password: this.config.password,
        db: this.config.db,
        connectTimeout: 5000,
        lazyConnect: true,
      });

      await client.connect();
      await client.ping();
      const latency = Date.now() - startTime;

      await client.quit();

      const health = this.nodeHealth.get(nodeKey)!;
      health.healthy = true;
      health.latency = latency;
      health.lastCheck = new Date();
      health.consecutiveFailures = 0;

      return true;
    } catch (error) {
      const health = this.nodeHealth.get(nodeKey);
      if (health) {
        health.healthy = false;
        health.latency = Infinity;
        health.lastCheck = new Date();
        health.consecutiveFailures++;
      }

      return false;
    }
  }

  private async ensureMinPoolSize(): Promise<void> {
    while (this.pool.size < this.config.minPoolSize) {
      await this.createConnection();
    }
  }

  private async createConnection(): Promise<PooledConnection> {
    if (!this.activeNode) {
      throw new Error('No active node available');
    }

    const client = new Redis({
      host: this.activeNode.host,
      port: this.activeNode.port,
      password: this.config.password,
      db: this.config.db,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    const conn: PooledConnection = {
      id: uuid(),
      client,
      node: this.activeNode,
      state: 'connecting',
      lastUsed: new Date(),
      errorCount: 0,
      created: new Date(),
    };

    // Set up event handlers
    client.on('connect', () => {
      conn.state = 'connected';
      this.emit('connection:established', conn.id);
    });

    client.on('error', (error) => {
      conn.errorCount++;
      this.emit('connection:error', { id: conn.id, error });

      if (conn.errorCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.destroyConnection(conn.id);
      }
    });

    client.on('close', () => {
      conn.state = 'disconnected';
      this.emit('connection:closed', conn.id);
    });

    await client.ping(); // Verify connection
    conn.state = 'connected';

    this.pool.set(conn.id, conn);
    return conn;
  }

  private getIdleConnection(): PooledConnection | null {
    for (const conn of this.pool.values()) {
      if (conn.state === 'connected' && conn.node === this.activeNode) {
        return conn;
      }
    }
    return null;
  }

  private async waitForConnection(): Promise<Redis> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitQueue.findIndex(w => w.resolve === resolver);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.config.acquireTimeout);

      const resolver = (conn: PooledConnection) => {
        resolve(conn.client);
      };

      this.waitQueue.push({ resolve: resolver, reject, timeout });
    });
  }

  private destroyConnection(id: string): void {
    const conn = this.pool.get(id);
    if (conn) {
      conn.client.disconnect();
      this.pool.delete(id);
      this.emit('connection:destroyed', id);
    }
  }

  private shouldTriggerFailover(error: Error): boolean {
    const failoverErrors = [
      'READONLY',
      'CLUSTERDOWN',
      'LOADING',
      'MASTERDOWN',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
    ];

    return failoverErrors.some(e => error.message.includes(e));
  }

  private async handleFailover(error: Error): Promise<void> {
    if (this.config.failoverMode === 'manual') {
      this.emit('failover:required', { error, activeNode: this.activeNode });
      return;
    }

    await this.performFailover('connection-lost');
  }

  private async performFailover(
    reason: FailoverReason,
    targetNode?: RedisNodeConfig,
  ): Promise<void> {
    if (this.failoverInProgress) {
      return;
    }

    this.failoverInProgress = true;
    const startTime = Date.now();
    const fromNode = this.activeNode;

    const failoverEvent: FailoverEvent = {
      id: uuid(),
      timestamp: new Date(),
      fromNode: fromNode!,
      toNode: null as any,
      reason,
      duration: 0,
      success: false,
      automatic: reason !== 'manual-trigger',
    };

    this.emit('failover:initiated', failoverEvent);

    try {
      // Find a healthy node to failover to
      let newNode: RedisNodeConfig | null = targetNode ?? null;

      if (!newNode) {
        // Prefer replicas if primary failed
        const replicas = this.config.nodes.filter(
          n => n.role === 'replica' && n !== fromNode,
        );

        for (const replica of replicas) {
          if (await this.checkNodeHealth(replica)) {
            newNode = replica;
            break;
          }
        }

        // If no replica, try any other node
        if (!newNode) {
          newNode = await this.findPrimaryNode();
        }
      }

      if (!newNode) {
        if (this.config.airgapMode) {
          this.emit('airgap:activated');
          failoverEvent.success = false;
        } else {
          throw new Error('No healthy node available for failover');
        }
      } else {
        // Close existing connections
        for (const conn of this.pool.values()) {
          if (conn.node === fromNode) {
            this.destroyConnection(conn.id);
          }
        }

        // Update active node
        this.activeNode = newNode;
        failoverEvent.toNode = newNode;

        // Create new connections
        await this.ensureMinPoolSize();

        failoverEvent.success = true;
        failoverEvent.duration = Date.now() - startTime;

        this.addToHistory(failoverEvent);
        this.emit('failover:completed', failoverEvent);
      }
    } catch (error) {
      failoverEvent.duration = Date.now() - startTime;
      this.addToHistory(failoverEvent);
      this.emit('failover:failed', failoverEvent, error);
      throw error;
    } finally {
      this.failoverInProgress = false;
    }
  }

  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const node of this.config.nodes) {
        await this.checkNodeHealth(node);
      }

      // Check if current node is unhealthy
      if (this.activeNode) {
        const health = this.nodeHealth.get(this.getNodeKey(this.activeNode));
        if (
          health &&
          !health.healthy &&
          health.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD
        ) {
          await this.handleFailover(new Error('Active node unhealthy'));
        }
      }
    }, this.config.healthCheckInterval);
  }

  private startIdleConnectionCleanup(): void {
    this.idleCheckTimer = setInterval(() => {
      const now = Date.now();

      for (const [id, conn] of this.pool.entries()) {
        // Don't remove connections below minimum
        if (this.pool.size <= this.config.minPoolSize) {
          break;
        }

        // Remove idle connections
        if (
          conn.state === 'connected' &&
          now - conn.lastUsed.getTime() > this.config.idleTimeout
        ) {
          this.destroyConnection(id);
        }
      }
    }, this.config.idleTimeout / 2);
  }

  private getNodeKey(node: RedisNodeConfig): string {
    return `${node.host}:${node.port}`;
  }

  private addToHistory(event: FailoverEvent): void {
    this.failoverHistory.push(event);
    if (this.failoverHistory.length > this.MAX_HISTORY) {
      this.failoverHistory.shift();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a Redis cluster client with sensible defaults
 */
export function createRedisClusterClient(
  config: RedisClusterConfig,
): RedisClusterClient {
  return new RedisClusterClient(config);
}
