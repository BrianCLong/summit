// @ts-nocheck
import uWS from 'uWebSockets.js';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { getPostgresPool } from '../db/postgres.js';
import {
  ManagedConnection,
  WebSocketConnectionPool,
} from './connectionManager.js';
import { activeConnections } from '../observability/metrics.js';
import { YjsHandler } from '../yjs/YjsHandler.js';

interface WebSocketClaims {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  sub: string;
  exp: number;
}

interface WebSocketConnection extends WebSocketClaims {
  ws: uWS.WebSocket;
  // Subscriptions are now managed in ManagedConnection for persistence
  // subscriptions: Set<string>;
  lastHeartbeat: number;
  backpressure: number;
  meshRoute?: string;
  manager?: ManagedConnection;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'publish' | 'heartbeat';
  topics?: string[];
  topic?: string;
  payload?: unknown;
  timestamp?: number;
  id?: string;
}

export class WebSocketCore {
  private app: uWS.App;
  private redis: Redis;
  private connections = new Map<string, WebSocketConnection>();
  private readonly connectionPool: WebSocketConnectionPool;
  private readonly JWT_SECRET: string;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_BACKPRESSURE = 64 * 1024; // 64KB
  private readonly TOPIC_PREFIX = 'maestro:';
  private yjsHandler: YjsHandler;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
    if (this.JWT_SECRET === 'dev-secret' && process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: JWT_SECRET using insecure default in production');
      // In strict mode, we might want to throw, but for now log critical error
      // throw new Error('JWT_SECRET must be set in production');
    }

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
    this.yjsHandler = new YjsHandler(this.redis);

    this.connectionPool = new WebSocketConnectionPool({
      maxQueueSize: parseInt(process.env.WS_MAX_QUEUE_SIZE || '500', 10),
      replayBatchSize: parseInt(process.env.WS_REPLAY_BATCH_SIZE || '50', 10),
      queueFlushInterval: parseInt(
        process.env.WS_QUEUE_FLUSH_INTERVAL_MS || '1500',
        10,
      ),
      rateLimitPerSecond: parseInt(
        process.env.WS_RATE_LIMIT_PER_SECOND || '40',
        10,
      ),
      backpressureThreshold: this.MAX_BACKPRESSURE,
      heartbeatTimeout: this.HEARTBEAT_INTERVAL * 2,
      initialRetryDelay: parseInt(process.env.WS_RETRY_DELAY_MS || '1000', 10),
      maxRetryDelay: parseInt(process.env.WS_RETRY_MAX_DELAY_MS || '60000', 10),
    });

    this.setupRedisSubscriptions();
    this.startHeartbeatCheck();
    this.createApp();
  }

  private verifyJWT(token: string): WebSocketClaims | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as jwt.JwtPayload & {
        tenantId?: string;
        userId?: string;
        roles?: string[];
        permissions?: string[];
      };
      return {
        tenantId: decoded.tenantId || 'default',
        userId: decoded.sub || decoded.userId || 'unknown',
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
        sub: decoded.sub || 'unknown',
        exp: decoded.exp || 0,
      };
    } catch (error: any) {
      console.warn('JWT verification failed:', error);
      return null;
    }
  }

  private async checkInvestigationAccess(userId: string, investigationId: string): Promise<boolean> {
    try {
      const pool = getPostgresPool();
      // Check for direct membership
      const result = await pool.query(
        'SELECT 1 FROM investigation_members WHERE user_id = $1 AND investigation_id = $2',
        [userId, investigationId]
      );
      if (result.rowCount > 0) return true;

      // Check if user is owner/creator of the investigation (assuming 'investigations' table)
      const invResult = await pool.query(
          'SELECT 1 FROM investigations WHERE id = $1 AND created_by = $2',
          [investigationId, userId]
      );
      return invResult.rowCount > 0;
    } catch (error: any) {
      // If tables don't exist, we might be in a fresh env.
      // Log warning and default to deny for security (IG-204)
      console.warn(`Investigation access check failed for ${investigationId}:`, error);
      return false;
    }
  }

  private async opaAllow(
    claims: WebSocketClaims,
    message: WebSocketMessage,
  ): Promise<boolean> {
    const span = otelService.createSpan('websocket.opa_check');

    try {
      // Basic policy checks for WebSocket operations
      const context = {
        user: {
          tenantId: claims.tenantId,
          userId: claims.userId,
          roles: claims.roles,
          permissions: claims.permissions,
        },
        resource: {
          type: 'websocket',
          topic: message.topic,
          topics: message.topics,
          action: message.type,
        },
        environment: {
          ip: 'unknown', // Would need to pass from connection
          timestamp: Date.now(),
        },
      };

      // Simple built-in policies (replace with OPA integration)
      const policies = {
        // Users can only subscribe to their tenant's topics
        subscribe: async (ctx: any) => {
          const topics = ctx.resource.topics || (ctx.resource.topic ? [ctx.resource.topic] : []);
          if (topics.length === 0) return false;

          for (const topic of topics) {
             // Investigation Room Authorization
             if (topic.startsWith('investigation:')) {
                 const invId = topic.split(':')[1];
                 // Check if user has explicit access to this investigation
                 // Fallback to role check if DB check fails (or mock for now)
                 const hasAccess = await this.checkInvestigationAccess(ctx.user.userId, invId);
                 if (!hasAccess) return false;
             }
             // General Tenant Check (topics shouldn't cross tenant boundary)
             // Note: core logic prefixes tenantId, so clients send raw topic.
             // We trust the prefixing logic for isolation, but if topic ITSELF contains tenant info...
             // Here we assume client sends "investigation:123". Core makes it "tenant.investigation:123".
          }
          return true;
        },

        // Only admins can publish system-wide messages
        publish: (ctx: any) => {
          if (ctx.resource.topic?.startsWith('system.')) {
            return ctx.user.roles.includes('ADMIN');
          }
          return this.policies.subscribe(ctx);
        },

        // Heartbeat always allowed
        heartbeat: () => true,

        // Unsubscribe follows same rules as subscribe
        unsubscribe: (ctx: any) => this.policies.subscribe(ctx),
      };

      const policyFn = policies[message.type as keyof typeof policies];
      const allowed = policyFn ? await policyFn(context) : false;

      span?.addSpanAttributes({
        'websocket.opa.allowed': allowed,
        'websocket.opa.tenant_id': claims.tenantId,
        'websocket.opa.user_id': claims.userId,
        'websocket.opa.topic': message.topic || '',
        'websocket.opa.action': message.type,
      });

      return allowed;
    } catch (error: any) {
      console.error('OPA check failed:', error);
      return false; // Fail closed
    } finally {
      span?.end();
    }
  }

  private getServiceMeshRoute(req: uWS.HttpRequest): string | undefined {
    const headers = [
      'x-service-mesh-route',
      'x-envoy-original-dst-host',
      'x-istio-original-dst-host',
      'x-forwarded-host',
    ];

    for (const header of headers) {
      const value = req.getHeader(header);
      if (value) {
        return `${header}:${value}`;
      }
    }

    return undefined;
  }

  private createApp() {
    this.app = uWS.App({
      // SSL configuration if needed
      ...(process.env.SSL_KEY &&
        process.env.SSL_CERT && {
          key_file_name: process.env.SSL_KEY,
          cert_file_name: process.env.SSL_CERT,
        }),
    });

    // Y.js WebSocket handler
    this.app.ws('/yjs/:docName', {
      upgrade: (res, req, context) => {
        const span = otelService.createSpan('websocket.yjs.upgrade');
        try {
          // Extract docName from URL
          const url = req.getUrl();
          const docName = url.split('/yjs/')[1];

          if (!docName) {
            res.writeStatus('400 Bad Request').end();
            return;
          }

          // Support both header and query param for auth (common in Y.js clients)
          let token = req.getHeader('authorization')?.replace('Bearer ', '');
          if (!token) {
            const query = req.getQuery();
            const params = new URLSearchParams(query);
            token = params.get('token') || '';
          }

          if (!token) {
            console.warn('Yjs upgrade failed: No token provided');
            res.writeStatus('401 Unauthorized').end();
            return;
          }

          const claims = this.verifyJWT(token);
          if (!claims) {
            console.warn('Yjs upgrade failed: Invalid token');
            res.writeStatus('401 Unauthorized').end();
            return;
          }

          res.upgrade(
            {
              ...claims,
              docName,
              isYjs: true,
            },
            req.getHeader('sec-websocket-key'),
            req.getHeader('sec-websocket-protocol'),
            req.getHeader('sec-websocket-extensions'),
            context
          );
        } catch (error: any) {
            console.error('Yjs upgrade error:', error);
            res.writeStatus('500 Internal Server Error').end();
        } finally {
            span?.end();
        }
      },
      open: (ws) => {
        const docName = (ws as any).docName;
        this.yjsHandler.handleConnection(ws, docName);
      },
      message: (ws, message, isBinary) => {
        const buffer = Buffer.from(message);
        const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        this.yjsHandler.handleMessage(ws, uint8Array);
      },
      close: (ws, code, message) => {
        this.yjsHandler.handleClose(ws);
      }
    });

    this.app.ws('/*', {
      /* WebSocket upgrade handler */
      upgrade: (res, req, context) => {
        const span = otelService.createSpan('websocket.upgrade');

        try {
          const token = req.getHeader('authorization')?.replace('Bearer ', '');
          if (!token) {
            console.warn('WebSocket upgrade failed: No token provided');
            res.writeStatus('401 Unauthorized').end();
            return;
          }

          const claims = this.verifyJWT(token);
          if (!claims) {
            console.warn('WebSocket upgrade failed: Invalid token');
            res.writeStatus('401 Unauthorized').end();
            return;
          }

          // Check token expiration
          if (Date.now() / 1000 > claims.exp) {
            console.warn('WebSocket upgrade failed: Token expired');
            res.writeStatus('401 Unauthorized').end();
            return;
          }

          const meshRoute = this.getServiceMeshRoute(req);

          console.log(
            `WebSocket upgrade: ${claims.userId}@${claims.tenantId}` +
              (meshRoute ? ` via ${meshRoute}` : ''),
          );

          res.upgrade(
            {
              ...claims,
              lastHeartbeat: Date.now(),
              backpressure: 0,
              meshRoute,
            },
            req.getHeader('sec-websocket-key'),
            req.getHeader('sec-websocket-protocol'),
            req.getHeader('sec-websocket-extensions'),
            context,
          );

          span?.addSpanAttributes({
            'websocket.tenant_id': claims.tenantId,
            'websocket.user_id': claims.userId,
            'websocket.roles': claims.roles.join(','),
          });
        } catch (error: any) {
          console.error('WebSocket upgrade error:', error);
          res.writeStatus('500 Internal Server Error').end();
        } finally {
          span?.end();
        }
      },

      /* WebSocket message handler */
      message: async (ws: any, message: ArrayBuffer, opCode) => {
        const span = otelService.createSpan('websocket.message');
        const connection = ws as WebSocketConnection;

        try {
          const messageStr = Buffer.from(message).toString('utf8');
          const msg: WebSocketMessage = JSON.parse(messageStr);

          // Update heartbeat timestamp
          connection.lastHeartbeat = Date.now();
          connection.manager?.updateHeartbeat();

          // OPA policy check
          const allowed = await this.opaAllow(connection, msg);
          if (!allowed) {
            const errorPayload = {
              type: 'error',
              error: 'Policy violation',
              message: 'Action not allowed by policy',
              timestamp: Date.now(),
            };
            if (!connection.manager?.sendJson(errorPayload)) {
              ws.send(JSON.stringify(errorPayload), opCode);
            }
            return;
          }

          // Handle different message types
          await this.handleMessage(connection, msg);

          span?.addSpanAttributes({
            'websocket.message.type': msg.type,
            'websocket.message.topic': msg.topic || '',
            'websocket.tenant_id': connection.tenantId,
            'websocket.user_id': connection.userId,
          });
        } catch (error: any) {
          console.error('WebSocket message error:', error);
          const errorPayload = {
            type: 'error',
            error: 'Message processing failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          };
          if (!connection.manager?.sendJson(errorPayload)) {
            ws.send(JSON.stringify(errorPayload), opCode);
          }
        } finally {
          span?.end();
        }
      },

      /* WebSocket open handler */
      open: (ws: any) => {
        const connection = ws as WebSocketConnection;
        const connectionId = connection.userId + '@' + connection.tenantId;
        const manager = this.connectionPool.registerConnection(
          connectionId,
          ws,
          {
            id: connectionId,
            tenantId: connection.tenantId,
            userId: connection.userId,
            route: connection.meshRoute,
          },
        );
        connection.manager = manager;
        this.connections.set(connectionId, connection);
        activeConnections.inc({ tenant: connection.tenantId });

        // Restore subscriptions to Redis if reconnecting
        if (manager.subscriptions.size > 0) {
           for (const tenantTopic of manager.subscriptions) {
               // manager.subscriptions already stores fully qualified "tenant.topic"
               // We need to use connectionId to match pmessage logic
               this.redis.sadd(
                 `${this.TOPIC_PREFIX}${tenantTopic}:subscribers`,
                 connectionId,
               ).catch(err => console.error('Error restoring subscription', err));
           }
        }

        console.log(
          `WebSocket opened: ${connection.userId}@${connection.tenantId}` +
            (connection.meshRoute ? ` via ${connection.meshRoute}` : ''),
        );

        const welcomeMessage = {
          type: 'welcome',
          message: 'Connected to Maestro WebSocket',
          tenantId: connection.tenantId,
          userId: connection.userId,
          timestamp: Date.now(),
          route: connection.meshRoute,
        };

        if (!manager.sendJson(welcomeMessage)) {
          ws.send(JSON.stringify(welcomeMessage));
        }
      },

      /* WebSocket close handler */
      close: (ws: any, code, message) => {
        const connection = ws as WebSocketConnection;
        const connectionId = connection.userId + '@' + connection.tenantId;

        this.connections.delete(connectionId);
        activeConnections.dec({ tenant: connection.tenantId });

        if (code === 1000) {
           // Graceful close: cleanup subscriptions
           if (connection.manager) {
             for (const topic of connection.manager.subscriptions) {
                // connection.manager.subscriptions stores simple topic names,
                // but Redis needs the full key. However, we reconstruct it in 'subscribe'
                // Wait, connection.subscriptions previously stored "tenant.topic".
                // We should be consistent.
                // Let's assume manager.subscriptions stores the "tenant.topic" (fully qualified in context of Redis prefix)
                // actually the subscribe logic below adds tenantId.
                // Re-reading 'subscribe' block below:
                // const tenantTopic = `${connection.tenantId}.${topic}`;
                // connection.subscriptions.add(tenantTopic);
                // So yes, it stores tenantTopic.

                this.redis.srem(
                  `${this.TOPIC_PREFIX}${topic}:subscribers`,
                  connectionId,
                ).catch(err => console.error('Error removing subscription', err));
             }
             connection.manager.subscriptions.clear();
           }
          this.connectionPool.removeConnection(connectionId, 'graceful_close');
        } else {
          // Abnormal close: keep subscriptions for potential reconnect
          // Do NOT remove from Redis yet. If they don't reconnect, they will eventually expire from Redis?
          // No, Redis sets don't expire members individually.
          // We rely on 'startHeartbeatCheck' to clean up stale connections.
          // The heartbeat check calls pool.closeIdleConnections which calls removeConnection.

          // But wait, removeConnection logic needs to clean up Redis too if called by heartbeat.
          // The heartbeat cleaner calls connection.close() then pool.removeConnection.
          // It doesn't call this 'close' handler of the websocket because the WS is already likely dead or this IS the close handler.

          // Actually, if heartbeat times out, `pool.closeIdleConnections` is called.
          // That calls `connection.close()`.
          // `connection.close()` calls `ws.close()`.
          // `ws.close()` triggers this handler.
          // So if heartbeat kills it, code might be 4000 (from closeIdleConnections).
          // We should handle that cleanup.

          if (code === 4000) { // Heartbeat timeout
             if (connection.manager) {
                 for (const topic of connection.manager.subscriptions) {
                     this.redis.srem(`${this.TOPIC_PREFIX}${topic}:subscribers`, connectionId)
                        .catch(e => console.error('Error cleaning up stale sub', e));
                 }
                 connection.manager.subscriptions.clear();
             }
             this.connectionPool.removeConnection(connectionId, 'heartbeat_timeout');
          } else {
             connection.manager?.markReconnecting(`close_${code}`);
          }
        }

        console.log(
          `WebSocket closed: ${connectionId}, code: ${code}, reason: ${message || 'n/a'}`,
        );
      },

      /* Settings */
      compression: uWS.SHARED_COMPRESSOR,
      maxCompressedSize: 64 * 1024, // 64KB
      maxBackpressure: this.MAX_BACKPRESSURE,
      closeOnBackpressureLimit: false,
      resetIdleTimeoutOnSend: true,
      idleTimeout: 32, // 32 seconds (heartbeat is 30s)
    });
  }

  private async handleMessage(
    connection: WebSocketConnection,
    msg: WebSocketMessage,
  ) {
    const connectionId = connection.userId + '@' + connection.tenantId;

    switch (msg.type) {
      case 'subscribe':
        if (msg.topics && connection.manager) {
          for (const topic of msg.topics) {
            const tenantTopic = `${connection.tenantId}.${topic}`;
            connection.manager.subscriptions.add(tenantTopic);
            await this.redis.sadd(
              `${this.TOPIC_PREFIX}${tenantTopic}:subscribers`,
              connectionId,
            );
          }

          const subscribedPayload = {
            type: 'subscribed',
            topics: msg.topics,
            timestamp: Date.now(),
          };
          if (!connection.manager?.sendJson(subscribedPayload)) {
            connection.ws.send(JSON.stringify(subscribedPayload));
          }
        }
        break;

      case 'unsubscribe':
        if (msg.topics && connection.manager) {
          for (const topic of msg.topics) {
            const tenantTopic = `${connection.tenantId}.${topic}`;
            connection.manager.subscriptions.delete(tenantTopic);
            await this.redis.srem(
              `${this.TOPIC_PREFIX}${tenantTopic}:subscribers`,
              connectionId,
            );
          }

          const unsubscribedPayload = {
            type: 'unsubscribed',
            topics: msg.topics,
            timestamp: Date.now(),
          };
          if (!connection.manager?.sendJson(unsubscribedPayload)) {
            connection.ws.send(JSON.stringify(unsubscribedPayload));
          }
        }
        break;

      case 'publish':
        if (msg.topic && msg.payload) {
          const tenantTopic = `${connection.tenantId}.${msg.topic}`;
          const publishMsg = {
            type: 'message',
            topic: msg.topic,
            payload: msg.payload,
            from: connectionId,
            timestamp: Date.now(),
          };

          await this.redis.publish(
            `${this.TOPIC_PREFIX}${tenantTopic}`,
            JSON.stringify(publishMsg),
          );

          // Audit the publish event
          await this.auditWebSocketEvent(connection, 'publish', {
            topic: tenantTopic,
            payloadSize: JSON.stringify(msg.payload).length,
          });
        }
        break;

      case 'heartbeat':
        connection.lastHeartbeat = Date.now();
        const heartbeatAck = {
          type: 'heartbeat_ack',
          timestamp: Date.now(),
        };
        if (!connection.manager?.sendJson(heartbeatAck)) {
          connection.ws.send(JSON.stringify(heartbeatAck));
        }
        break;
    }
  }

  private setupRedisSubscriptions() {
    const subscriber = this.redis.duplicate();

    subscriber.psubscribe(`${this.TOPIC_PREFIX}*`, (err, count) => {
      if (err) {
        console.error('Redis psubscribe error:', err);
      } else {
        console.log(`Subscribed to ${count} Redis patterns`);
      }
    });

    subscriber.on('pmessage', async (pattern, channel, message) => {
      const topic = channel.replace(this.TOPIC_PREFIX, '');
      const subscribers = await this.redis.smembers(`${channel}:subscribers`);

      for (const connectionId of subscribers) {
        // We need to find the manager, even if the specific connection object is transiently gone or replaced?
        // this.connections holds the current active connection wrapper.
        const connection = this.connections.get(connectionId);

        // If connection object exists, check manager subscriptions
        if (connection && connection.manager && connection.manager.subscriptions.has(topic)) {
          const sent = connection.manager.sendRaw(message);
          if (!sent) {
             // Fallback for direct WS if manager fails? (Unlikely if manager exists)
             // connection.ws.send(message);
          }
        }
      }
    });
  }

  private startHeartbeatCheck() {
    setInterval(() => {
      const closed = this.connectionPool.closeIdleConnections(
        this.HEARTBEAT_INTERVAL * 2,
      );
      for (const connectionId of closed) {
        const connection = this.connections.get(connectionId);
        this.connections.delete(connectionId);
        if (connection) {
          activeConnections.dec({ tenant: connection.tenantId });
        }
        console.log(`Closing stale connection: ${connectionId}`);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private async auditWebSocketEvent(
    connection: WebSocketConnection,
    action: string,
    details: any,
  ) {
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO websocket_audit (tenant_id, user_id, action, details, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [
          connection.tenantId,
          connection.userId,
          action,
          JSON.stringify(details),
        ],
      );
    } catch (error: any) {
      console.error('WebSocket audit logging failed:', error);
    }
  }

  public listen(port: number = 9001) {
    this.app.listen(port, (token) => {
      if (token) {
        console.log(`🚀 WebSocket Core listening on port ${port}`);
      } else {
        console.error(`❌ Failed to listen to port ${port}`);
      }
    });
  }

  public notifyServerRestart(reason = 'maintenance'): void {
    this.connectionPool.handleServerRestart(reason);
  }

  public async publishToTopic(tenantId: string, topic: string, payload: any) {
    const tenantTopic = `${tenantId}.${topic}`;
    const message = {
      type: 'message',
      topic,
      payload,
      from: 'system',
      timestamp: Date.now(),
    };

    await this.redis.publish(
      `${this.TOPIC_PREFIX}${tenantTopic}`,
      JSON.stringify(message),
    );
  }

  public getConnectionStats() {
    const poolStats = this.connectionPool.getStats();
    return {
      totalConnections: poolStats.totalConnections,
      connectionsByTenant: poolStats.connections.reduce(
        (acc, conn) => {
          acc[conn.tenantId] = (acc[conn.tenantId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      states: poolStats.byState,
      details: poolStats.connections,
    };
  }
}

// Additional schema for WebSocket audit
export const WEBSOCKET_AUDIT_SCHEMA = `
CREATE TABLE IF NOT EXISTS websocket_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS websocket_audit_tenant_time_idx ON websocket_audit (tenant_id, created_at DESC);
`;
