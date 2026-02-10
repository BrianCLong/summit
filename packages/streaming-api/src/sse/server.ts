/**
 * Server-Sent Events (SSE) Streaming Server
 *
 * Provides real-time unidirectional streaming over HTTP
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';
import type {
  SSEConnection,
  SSEMessage,
  StreamEvent,
  StreamError,
} from '../types';

export interface SSEServerOptions {
  heartbeatInterval?: number;
  retryInterval?: number;
  maxConnections?: number;
  authenticate?: (token: string) => Promise<any>;
}

export class SSEServer extends EventEmitter {
  private connections: Map<string, SSEConnection> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // topic -> connectionIds
  private options: Required<SSEServerOptions>;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(options: SSEServerOptions = {}) {
    super();

    this.options = {
      heartbeatInterval: options.heartbeatInterval || 30000,
      retryInterval: options.retryInterval || 3000,
      maxConnections: options.maxConnections || 10000,
      authenticate: options.authenticate || (async () => ({})),
    };

    this.startHeartbeat();
  }

  /**
   * Handle SSE connection
   */
  handleConnection(req: Request, res: Response, options?: {
    topics?: string[];
    authenticate?: boolean;
  }) {
    const connectionId = uuidv4();

    // Check connection limit
    if (this.connections.size >= this.options.maxConnections) {
      res.status(503).send('Max connections reached');
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send retry interval
    this.sendSSE(res, {
      retry: this.options.retryInterval,
      data: '',
    });

    const connection: SSEConnection = {
      id: connectionId,
      response: res,
      subscriptions: new Set(),
      metadata: {
        connectedAt: new Date(),
        lastActivity: new Date(),
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      },
    };

    this.connections.set(connectionId, connection);

    // Auto-subscribe to topics if provided
    if (options?.topics) {
      options.topics.forEach((topic) => {
        this.subscribe(connectionId, topic);
      });
    }

    // Send welcome message
    this.sendEvent(connectionId, {
      id: uuidv4(),
      topic: 'system',
      type: 'connected',
      data: { connectionId },
      timestamp: new Date(),
    });

    // Handle client disconnect
    req.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    this.emit('connection', connection);
  }

  /**
   * Subscribe a connection to a topic
   */
  subscribe(connectionId: string, topic: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscriptions.add(topic);

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(connectionId);

    this.emit('subscribe', { connectionId, topic });
  }

  /**
   * Unsubscribe a connection from a topic
   */
  unsubscribe(connectionId: string, topic: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscriptions.delete(topic);

    const topicSubs = this.subscriptions.get(topic);
    if (topicSubs) {
      topicSubs.delete(connectionId);
      if (topicSubs.size === 0) {
        this.subscriptions.delete(topic);
      }
    }

    this.emit('unsubscribe', { connectionId, topic });
  }

  /**
   * Broadcast event to all subscribers of a topic
   */
  broadcast(topic: string, event: StreamEvent) {
    const subscribers = this.subscriptions.get(topic);
    if (!subscribers) return;

    subscribers.forEach((connectionId) => {
      this.sendEvent(connectionId, event);
    });
  }

  /**
   * Send event to a specific connection
   */
  sendEvent(connectionId: string, event: StreamEvent) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.metadata.lastActivity = new Date();

    this.sendSSE(connection.response, {
      id: event.id,
      event: event.type,
      data: JSON.stringify({
        topic: event.topic,
        data: event.data,
        timestamp: event.timestamp,
        metadata: event.metadata,
      }),
    });
  }

  /**
   * Send error to a specific connection
   */
  sendError(connectionId: string, error: StreamError) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.sendSSE(connection.response, {
      event: 'error',
      data: JSON.stringify(error),
    });
  }

  /**
   * Send raw SSE message
   */
  private sendSSE(res: Response, message: SSEMessage) {
    try {
      if (message.id) {
        res.write(`id: ${message.id}\n`);
      }

      if (message.event) {
        res.write(`event: ${message.event}\n`);
      }

      if (message.retry) {
        res.write(`retry: ${message.retry}\n`);
      }

      res.write(`data: ${message.data}\n\n`);
    } catch (error) {
      console.error('Failed to send SSE message:', error);
    }
  }

  /**
   * Send heartbeat to all connections
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.connections.forEach((connection) => {
        this.sendSSE(connection.response, {
          event: 'heartbeat',
          data: JSON.stringify({ timestamp: new Date() }),
        });
      });
    }, this.options.heartbeatInterval);
  }

  /**
   * Handle connection disconnect
   */
  private handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from all subscriptions
    connection.subscriptions.forEach((topic) => {
      const topicSubs = this.subscriptions.get(topic);
      if (topicSubs) {
        topicSubs.delete(connectionId);
        if (topicSubs.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
    });

    this.connections.delete(connectionId);
    this.emit('disconnection', connection);
  }

  /**
   * Get connection statistics
   */
  getStatistics() {
    return {
      connections: this.connections.size,
      subscriptions: Array.from(this.subscriptions.values()).reduce(
        (sum, subs) => sum + subs.size,
        0
      ),
      topics: this.subscriptions.size,
    };
  }

  /**
   * Close the server
   */
  close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.connections.forEach((connection) => {
      connection.response.end();
    });

    this.connections.clear();
    this.subscriptions.clear();
  }
}
