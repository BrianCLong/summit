/**
 * WebSocket Server Setup
 * Configures Socket.IO server with Redis adapter and all middleware
 */

import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import helmet from 'helmet';
import cors from 'cors';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  WebSocketConfig,
} from './types/index.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createRateLimitMiddleware } from './middleware/rateLimit.js';
import { AdaptiveRateLimiter } from '../../../lib/streaming/rate-limiter.js';
import { ConnectionManager } from './managers/ConnectionManager.js';
import { PresenceManager } from './managers/PresenceManager.js';
import { RoomManager } from './managers/RoomManager.js';
import { MessagePersistence } from './managers/MessagePersistence.js';
import { HealthChecker } from './health.js';
import { registerEventHandlers } from './handlers/index.js';
import { logger } from './utils/logger.js';
import * as metrics from './metrics/prometheus.js';

export class WebSocketServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private redis: Redis;
  private redisSub: Redis;
  private config: WebSocketConfig;
  private rateLimiter: AdaptiveRateLimiter;
  private connectionManager: ConnectionManager;
  private presenceManager: PresenceManager;
  private roomManager: RoomManager;
  private messagePersistence: MessagePersistence;
  private healthChecker: HealthChecker;

  constructor(config: WebSocketConfig) {
    this.config = config;

    // Create Express app
    this.app = express();
    this.httpServer = createServer(this.app);

    // Setup Redis clients
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn({ attempt: times, delay }, 'Redis connection retry');
        return delay;
      },
    });

    this.redisSub = this.redis.duplicate();

    // Initialize managers
    this.rateLimiter = new AdaptiveRateLimiter({
      maxTokens: config.rateLimit.burstSize,
      refillRate: config.rateLimit.messageRatePerSecond,
    });
    this.connectionManager = new ConnectionManager();
    this.presenceManager = new PresenceManager(this.redis, config.persistence.ttl);
    this.roomManager = new RoomManager();
    this.messagePersistence = new MessagePersistence(
      this.redis,
      config.persistence.ttl,
      config.persistence.maxMessages
    );

    // Setup Socket.IO
    this.io = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(this.httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      },
      pingTimeout: config.heartbeat.timeout,
      pingInterval: config.heartbeat.interval,
      maxHttpBufferSize: 1e6, // 1MB
      transports: ['websocket', 'polling'],
    });

    // Setup Redis adapter for clustering
    if (config.clustering.enabled) {
      this.io.adapter(createAdapter(this.redis, this.redisSub));
      logger.info(
        { nodeId: config.clustering.nodeId },
        'Redis adapter configured for clustering'
      );
    }

    // Health checker
    this.healthChecker = new HealthChecker(this.redis, this.connectionManager);

    this.setupExpress();
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupBackgroundTasks();
  }

  private setupExpress(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors(this.config.cors));
    this.app.use(express.json());

    // Health endpoints
    this.app.get('/health', async (req, res) => {
      const health = await this.healthChecker.check();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    this.app.get('/health/ready', async (req, res) => {
      const health = await this.healthChecker.check();
      const ready = health.redis.connected && health.status !== 'unhealthy';
      res.status(ready ? 200 : 503).json({ ready });
    });

    this.app.get('/health/live', (req, res) => {
      res.status(200).json({ alive: true });
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        const metricsData = await metrics.getMetrics();
        res.set('Content-Type', metrics.register.contentType);
        res.end(metricsData);
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Failed to get metrics');
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // Stats endpoint (debug)
    this.app.get('/stats', (req, res) => {
      const stats = {
        connections: {
          total: this.connectionManager.getTotalConnections(),
          byTenant: this.connectionManager.getConnectionsByTenant(),
          byStatus: this.connectionManager.getConnectionsByStatus(),
        },
        rooms: this.roomManager.getStats(),
        clustering: {
          enabled: this.config.clustering.enabled,
          nodeId: this.config.clustering.nodeId,
        },
      };

      res.json(stats);
    });
  }

  private setupMiddleware(): void {
    // Authentication
    this.io.use(createAuthMiddleware(this.config));

    // Rate limiting
    this.io.use(createRateLimitMiddleware(this.rateLimiter));

    logger.info('Middleware configured');
  }

  private setupEventHandlers(): void {
    registerEventHandlers({
      io: this.io,
      connectionManager: this.connectionManager,
      presenceManager: this.presenceManager,
      roomManager: this.roomManager,
      messagePersistence: this.messagePersistence,
      rateLimiter: this.rateLimiter,
    });
  }

  private setupBackgroundTasks(): void {
    // Cleanup stale connections every 5 minutes
    setInterval(() => {
      const staleThreshold = this.config.heartbeat.timeout * 2;
      this.connectionManager.cleanupStale(staleThreshold);
    }, 5 * 60 * 1000);

    // Cleanup expired persisted messages every hour
    if (this.config.persistence.enabled) {
      setInterval(() => {
        this.messagePersistence.cleanupExpired().catch((error) => {
          logger.error({ error: error.message }, 'Failed to cleanup expired messages');
        });
      }, 60 * 60 * 1000);
    }

    logger.info('Background tasks scheduled');
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer.listen(this.config.port, this.config.host, () => {
          logger.info(
            {
              port: this.config.port,
              host: this.config.host,
              nodeId: this.config.clustering.nodeId,
              clustering: this.config.clustering.enabled,
            },
            '🚀 WebSocket server started'
          );
          resolve();
        });

        this.httpServer.on('error', (error) => {
          logger.error({ error: error.message }, 'HTTP server error');
          reject(error);
        });
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Failed to start server');
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    logger.info('Shutting down gracefully...');

    // Stop accepting new connections
    this.io.close();

    // Notify all clients about server restart
    this.io.emit('system:restart', {
      reason: 'Server shutting down',
      reconnectIn: 5000,
    });

    // Wait for clients to disconnect gracefully
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      this.httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Close Redis connections
    await this.redis.quit();
    await this.redisSub.quit();

    // Cleanup rate limiter
    this.rateLimiter.destroy();

    logger.info('Server shutdown complete');
  }

  public getIO(): Server {
    return this.io;
  }

  public getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }

  public getRoomManager(): RoomManager {
    return this.roomManager;
  }
}
