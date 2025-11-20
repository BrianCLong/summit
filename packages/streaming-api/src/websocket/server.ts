/**
 * WebSocket Streaming Server
 *
 * Provides real-time bidirectional streaming over WebSocket
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type {
  WebSocketConnection,
  ClientMessage,
  ServerMessage,
  StreamEvent,
  StreamError,
  Subscription,
  ConnectionMetadata,
} from '../types';

export interface WebSocketServerOptions {
  port?: number;
  server?: any;
  path?: string;
  maxConnections?: number;
  heartbeatInterval?: number;
  messageTimeout?: number;
  authenticate?: (token: string) => Promise<any>;
}

export class StreamingWebSocketServer extends EventEmitter {
  private wss: WebSocketServer;
  private connections: Map<string, WebSocketConnection> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // topic -> connectionIds
  private options: Required<WebSocketServerOptions>;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(options: WebSocketServerOptions = {}) {
    super();

    this.options = {
      port: options.port || 8080,
      server: options.server,
      path: options.path || '/ws',
      maxConnections: options.maxConnections || 10000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      messageTimeout: options.messageTimeout || 5000,
      authenticate: options.authenticate || (async () => ({})),
    };

    this.wss = new WebSocketServer({
      port: this.options.server ? undefined : this.options.port,
      server: this.options.server,
      path: this.options.path,
    });

    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (socket: WebSocket, request: any) => {
      this.handleConnection(socket, request);
    });

    // Start heartbeat
    this.startHeartbeat();
  }

  private handleConnection(socket: WebSocket, request: any) {
    const connectionId = uuidv4();

    // Check connection limit
    if (this.connections.size >= this.options.maxConnections) {
      socket.close(1008, 'Max connections reached');
      return;
    }

    const connection: WebSocketConnection = {
      id: connectionId,
      socket,
      subscriptions: new Set(),
      metadata: {
        connectedAt: new Date(),
        lastActivity: new Date(),
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
      },
    };

    this.connections.set(connectionId, connection);

    socket.on('message', (data: Buffer) => {
      this.handleMessage(connectionId, data);
    });

    socket.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    socket.on('error', (error: Error) => {
      this.handleError(connectionId, error);
    });

    // Send welcome message
    this.sendMessage(connectionId, {
      type: 'connected',
      id: connectionId,
      timestamp: new Date().toISOString(),
    });

    this.emit('connection', connection);
  }

  private async handleMessage(connectionId: string, data: Buffer) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.metadata.lastActivity = new Date();

    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(connectionId, message);
          break;

        case 'unsubscribe':
          await this.handleUnsubscribe(connectionId, message);
          break;

        case 'ack':
          this.emit('ack', { connectionId, messageId: message.messageId });
          break;

        case 'ping':
          this.sendMessage(connectionId, {
            type: 'pong',
            timestamp: Date.now(),
          });
          break;

        case 'query':
          await this.handleQuery(connectionId, message);
          break;

        default:
          this.sendError(connectionId, {
            code: 'UNKNOWN_MESSAGE_TYPE',
            message: `Unknown message type: ${(message as any).type}`,
            recoverable: true,
          });
      }
    } catch (error) {
      this.sendError(connectionId, {
        code: 'INVALID_MESSAGE',
        message: 'Failed to parse message',
        details: error,
        recoverable: true,
      });
    }
  }

  private async handleSubscribe(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { topic, filter } = message;

    // Add to connection subscriptions
    connection.subscriptions.add(topic);

    // Add to topic subscriptions
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(connectionId);

    // Send confirmation
    this.sendMessage(connectionId, {
      type: 'subscribed',
      id: message.id,
      topic,
      timestamp: new Date().toISOString(),
    });

    this.emit('subscribe', { connectionId, topic, filter });
  }

  private async handleUnsubscribe(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { topic } = message;

    // Remove from connection subscriptions
    connection.subscriptions.delete(topic);

    // Remove from topic subscriptions
    const topicSubs = this.subscriptions.get(topic);
    if (topicSubs) {
      topicSubs.delete(connectionId);
      if (topicSubs.size === 0) {
        this.subscriptions.delete(topic);
      }
    }

    // Send confirmation
    this.sendMessage(connectionId, {
      type: 'unsubscribed',
      id: message.id,
      topic,
      timestamp: new Date().toISOString(),
    });

    this.emit('unsubscribe', { connectionId, topic });
  }

  private async handleQuery(connectionId: string, message: any) {
    this.emit('query', {
      connectionId,
      queryId: message.id,
      query: message.query,
      stream: message.stream,
    });
  }

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

  private handleError(connectionId: string, error: Error) {
    this.emit('error', { connectionId, error });
  }

  /**
   * Broadcast event to all subscribers of a topic
   */
  broadcast(topic: string, event: StreamEvent) {
    const subscribers = this.subscriptions.get(topic);
    if (!subscribers) return;

    const message: ServerMessage = {
      type: 'data',
      subscriptionId: topic,
      event,
    };

    subscribers.forEach((connectionId) => {
      this.sendMessage(connectionId, message);
    });
  }

  /**
   * Send message to a specific connection
   */
  sendMessage(connectionId: string, message: ServerMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  /**
   * Send error to a specific connection
   */
  sendError(connectionId: string, error: StreamError, subscriptionId?: string) {
    this.sendMessage(connectionId, {
      type: 'error',
      error,
      subscriptionId,
    });
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();

      this.connections.forEach((connection, connectionId) => {
        const inactiveTime = now - connection.metadata.lastActivity.getTime();

        if (inactiveTime > this.options.heartbeatInterval * 2) {
          // Connection is dead
          connection.socket.terminate();
          this.handleDisconnection(connectionId);
        } else if (inactiveTime > this.options.heartbeatInterval) {
          // Send ping
          this.sendMessage(connectionId, {
            type: 'ping',
            timestamp: now,
          } as any);
        }
      });
    }, this.options.heartbeatInterval);
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
      connection.socket.close();
    });

    this.wss.close();
  }
}
