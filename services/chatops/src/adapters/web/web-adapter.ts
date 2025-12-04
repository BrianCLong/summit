/**
 * Web Adapter with WebSocket Support
 *
 * Provides real-time ChatOps integration for web clients:
 * - WebSocket-based bidirectional communication
 * - HTTP REST fallback
 * - Session management
 * - Streaming responses
 * - Reconnection handling
 *
 * Features:
 * - Multiple simultaneous connections per user
 * - Room-based collaboration
 * - Presence indicators
 * - Message queuing for offline clients
 */

import { WebSocket, WebSocketServer, RawData } from 'ws';
import { IncomingMessage, Server as HttpServer, createServer } from 'http';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import {
  ChatMessage,
  ChatResponse,
  SecurityContext,
  ReActTrace,
  ApprovalRequest,
} from '../../types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface WebAdapterConfig {
  port?: number;
  httpServer?: HttpServer;
  pingIntervalMs?: number;
  maxConnectionsPerUser?: number;
  messageQueueSize?: number;
  authHandler?: (token: string) => Promise<SecurityContext | null>;
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  id: string;
  payload: unknown;
  timestamp: number;
}

export type WebSocketMessageType =
  | 'message' // Chat message
  | 'response' // Chat response
  | 'stream_start' // Start streaming response
  | 'stream_chunk' // Streaming chunk
  | 'stream_end' // End streaming
  | 'trace_update' // ReAct trace update
  | 'approval_request' // HITL approval needed
  | 'approval_response' // HITL response
  | 'typing' // Typing indicator
  | 'presence' // Presence update
  | 'error' // Error message
  | 'ping' // Keep-alive ping
  | 'pong' // Keep-alive pong
  | 'subscribe' // Subscribe to channel
  | 'unsubscribe'; // Unsubscribe from channel

export interface WebConnection {
  id: string;
  socket: WebSocket;
  userId: string;
  tenantId: string;
  sessionId: string;
  context: SecurityContext;
  subscriptions: Set<string>;
  lastActivity: Date;
  messageQueue: WebSocketMessage[];
}

// =============================================================================
// WEB ADAPTER
// =============================================================================

export class WebAdapter extends EventEmitter {
  private wss: WebSocketServer;
  private httpServer?: HttpServer;
  private config: Required<WebAdapterConfig>;
  private connections: Map<string, WebConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private channels: Map<string, Set<string>> = new Map();
  private pingInterval?: NodeJS.Timeout;

  private messageHandler?: (
    message: ChatMessage,
    context: SecurityContext,
  ) => Promise<ChatResponse>;

  private approvalHandler?: (
    requestId: string,
    approved: boolean,
    userId: string,
  ) => Promise<void>;

  constructor(config: WebAdapterConfig) {
    super();

    this.config = {
      port: config.port ?? 3001,
      httpServer: config.httpServer as HttpServer,
      pingIntervalMs: config.pingIntervalMs ?? 30000,
      maxConnectionsPerUser: config.maxConnectionsPerUser ?? 5,
      messageQueueSize: config.messageQueueSize ?? 100,
      authHandler: config.authHandler ?? this.defaultAuthHandler,
    };

    // Create HTTP server if not provided
    if (!this.config.httpServer) {
      this.httpServer = createServer(this.handleHttpRequest.bind(this));
    }

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.config.httpServer ?? this.httpServer,
    });

    this.setupWebSocketServer();
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      const server = this.config.httpServer ?? this.httpServer!;

      server.listen(this.config.port, () => {
        console.log(`WebAdapter listening on port ${this.config.port}`);
        this.startPingInterval();
        resolve();
      });
    });
  }

  /**
   * Register message handler
   */
  onMessage(
    handler: (message: ChatMessage, context: SecurityContext) => Promise<ChatResponse>,
  ): void {
    this.messageHandler = handler;
  }

  /**
   * Register approval handler
   */
  onApproval(
    handler: (requestId: string, approved: boolean, userId: string) => Promise<void>,
  ): void {
    this.approvalHandler = handler;
  }

  /**
   * Send response to specific connection
   */
  sendToConnection(connectionId: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      // Queue message if connection exists but not ready
      if (connection) {
        this.queueMessage(connection, message);
      }
      return false;
    }

    connection.socket.send(JSON.stringify(message));
    return true;
  }

  /**
   * Send to all connections for a user
   */
  sendToUser(userId: string, tenantId: string, message: WebSocketMessage): number {
    const connectionIds = this.userConnections.get(`${tenantId}:${userId}`);
    if (!connectionIds) return 0;

    let sent = 0;
    for (const connectionId of connectionIds) {
      if (this.sendToConnection(connectionId, message)) {
        sent++;
      }
    }
    return sent;
  }

  /**
   * Broadcast to channel
   */
  broadcastToChannel(channel: string, message: WebSocketMessage): number {
    const connectionIds = this.channels.get(channel);
    if (!connectionIds) return 0;

    let sent = 0;
    for (const connectionId of connectionIds) {
      if (this.sendToConnection(connectionId, message)) {
        sent++;
      }
    }
    return sent;
  }

  /**
   * Stream response to connection
   */
  async streamResponse(
    connectionId: string,
    responseId: string,
    chunks: AsyncIterable<string>,
  ): Promise<void> {
    // Start stream
    this.sendToConnection(connectionId, {
      type: 'stream_start',
      id: responseId,
      payload: {},
      timestamp: Date.now(),
    });

    // Send chunks
    for await (const chunk of chunks) {
      this.sendToConnection(connectionId, {
        type: 'stream_chunk',
        id: responseId,
        payload: { content: chunk },
        timestamp: Date.now(),
      });
    }

    // End stream
    this.sendToConnection(connectionId, {
      type: 'stream_end',
      id: responseId,
      payload: {},
      timestamp: Date.now(),
    });
  }

  /**
   * Send approval request
   */
  sendApprovalRequest(
    userId: string,
    tenantId: string,
    request: ApprovalRequest,
  ): void {
    this.sendToUser(userId, tenantId, {
      type: 'approval_request',
      id: request.requestId,
      payload: request,
      timestamp: Date.now(),
    });
  }

  /**
   * Send trace update
   */
  sendTraceUpdate(
    connectionId: string,
    trace: Partial<ReActTrace>,
  ): void {
    this.sendToConnection(connectionId, {
      type: 'trace_update',
      id: trace.traceId ?? uuidv4(),
      payload: trace,
      timestamp: Date.now(),
    });
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get user's connection count
   */
  getUserConnectionCount(userId: string, tenantId: string): number {
    return this.userConnections.get(`${tenantId}:${userId}`)?.size ?? 0;
  }

  // ===========================================================================
  // WEBSOCKET SETUP
  // ===========================================================================

  private setupWebSocketServer(): void {
    this.wss.on('connection', async (socket, request) => {
      await this.handleConnection(socket, request);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
      this.emit('error', error);
    });
  }

  private async handleConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    // Extract auth token from query string or headers
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
    const token = url.searchParams.get('token') ?? request.headers.authorization?.split(' ')[1];

    if (!token) {
      socket.close(4001, 'Authentication required');
      return;
    }

    // Authenticate
    const context = await this.config.authHandler(token);
    if (!context) {
      socket.close(4001, 'Invalid authentication');
      return;
    }

    // Check connection limit
    const userKey = `${context.tenantId}:${context.userId}`;
    const existingConnections = this.userConnections.get(userKey)?.size ?? 0;

    if (existingConnections >= this.config.maxConnectionsPerUser) {
      socket.close(4029, 'Connection limit exceeded');
      return;
    }

    // Create connection
    const connectionId = uuidv4();
    const connection: WebConnection = {
      id: connectionId,
      socket,
      userId: context.userId,
      tenantId: context.tenantId,
      sessionId: context.sessionId,
      context,
      subscriptions: new Set(),
      lastActivity: new Date(),
      messageQueue: [],
    };

    // Register connection
    this.connections.set(connectionId, connection);

    if (!this.userConnections.has(userKey)) {
      this.userConnections.set(userKey, new Set());
    }
    this.userConnections.get(userKey)!.add(connectionId);

    // Setup handlers
    socket.on('message', (data) => this.handleMessage(connection, data));
    socket.on('close', () => this.handleDisconnect(connection));
    socket.on('error', (error) => this.handleError(connection, error));
    socket.on('pong', () => this.handlePong(connection));

    // Send queued messages
    this.flushMessageQueue(connection);

    // Emit connected event
    this.emit('connected', {
      connectionId,
      userId: context.userId,
      tenantId: context.tenantId,
    });

    console.log(`WebSocket connected: ${connectionId} (user: ${context.userId})`);
  }

  private async handleMessage(connection: WebConnection, data: RawData): Promise<void> {
    connection.lastActivity = new Date();

    let message: WebSocketMessage;
    try {
      message = JSON.parse(data.toString());
    } catch {
      this.sendError(connection, 'Invalid message format');
      return;
    }

    switch (message.type) {
      case 'message':
        await this.handleChatMessage(connection, message);
        break;

      case 'approval_response':
        await this.handleApprovalResponse(connection, message);
        break;

      case 'subscribe':
        this.handleSubscribe(connection, message);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(connection, message);
        break;

      case 'typing':
        this.handleTyping(connection, message);
        break;

      case 'ping':
        this.handleClientPing(connection, message);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async handleChatMessage(
    connection: WebConnection,
    message: WebSocketMessage,
  ): Promise<void> {
    if (!this.messageHandler) {
      this.sendError(connection, 'Message handler not configured');
      return;
    }

    const payload = message.payload as { content: string; threadId?: string };

    const chatMessage: ChatMessage = {
      messageId: message.id,
      platform: 'web',
      channelId: connection.sessionId,
      threadId: payload.threadId,
      userId: connection.userId,
      content: payload.content,
      timestamp: new Date(message.timestamp),
      metadata: {
        tenantId: connection.tenantId,
      },
    };

    try {
      const response = await this.messageHandler(chatMessage, connection.context);

      this.sendToConnection(connection.id, {
        type: 'response',
        id: uuidv4(),
        payload: response,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.sendError(
        connection,
        `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleApprovalResponse(
    connection: WebConnection,
    message: WebSocketMessage,
  ): Promise<void> {
    if (!this.approvalHandler) {
      this.sendError(connection, 'Approval handler not configured');
      return;
    }

    const payload = message.payload as { requestId: string; approved: boolean };

    try {
      await this.approvalHandler(
        payload.requestId,
        payload.approved,
        connection.userId,
      );

      this.sendToConnection(connection.id, {
        type: 'approval_response',
        id: message.id,
        payload: { success: true },
        timestamp: Date.now(),
      });
    } catch (error) {
      this.sendError(
        connection,
        `Error processing approval: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private handleSubscribe(connection: WebConnection, message: WebSocketMessage): void {
    const payload = message.payload as { channel: string };
    const channel = payload.channel;

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    this.channels.get(channel)!.add(connection.id);
    connection.subscriptions.add(channel);

    // Broadcast presence
    this.broadcastToChannel(channel, {
      type: 'presence',
      id: uuidv4(),
      payload: {
        userId: connection.userId,
        status: 'joined',
        channel,
      },
      timestamp: Date.now(),
    });
  }

  private handleUnsubscribe(connection: WebConnection, message: WebSocketMessage): void {
    const payload = message.payload as { channel: string };
    const channel = payload.channel;

    this.channels.get(channel)?.delete(connection.id);
    connection.subscriptions.delete(channel);

    // Broadcast presence
    this.broadcastToChannel(channel, {
      type: 'presence',
      id: uuidv4(),
      payload: {
        userId: connection.userId,
        status: 'left',
        channel,
      },
      timestamp: Date.now(),
    });
  }

  private handleTyping(connection: WebConnection, message: WebSocketMessage): void {
    const payload = message.payload as { channel?: string; isTyping: boolean };

    if (payload.channel) {
      this.broadcastToChannel(payload.channel, {
        type: 'typing',
        id: uuidv4(),
        payload: {
          userId: connection.userId,
          isTyping: payload.isTyping,
        },
        timestamp: Date.now(),
      });
    }
  }

  private handleClientPing(connection: WebConnection, message: WebSocketMessage): void {
    this.sendToConnection(connection.id, {
      type: 'pong',
      id: message.id,
      payload: {},
      timestamp: Date.now(),
    });
  }

  private handlePong(connection: WebConnection): void {
    connection.lastActivity = new Date();
  }

  private handleDisconnect(connection: WebConnection): void {
    // Remove from subscriptions
    for (const channel of connection.subscriptions) {
      this.channels.get(channel)?.delete(connection.id);

      // Broadcast presence
      this.broadcastToChannel(channel, {
        type: 'presence',
        id: uuidv4(),
        payload: {
          userId: connection.userId,
          status: 'disconnected',
          channel,
        },
        timestamp: Date.now(),
      });
    }

    // Remove from user connections
    const userKey = `${connection.tenantId}:${connection.userId}`;
    this.userConnections.get(userKey)?.delete(connection.id);

    // Remove connection
    this.connections.delete(connection.id);

    this.emit('disconnected', {
      connectionId: connection.id,
      userId: connection.userId,
      tenantId: connection.tenantId,
    });

    console.log(`WebSocket disconnected: ${connection.id}`);
  }

  private handleError(connection: WebConnection, error: Error): void {
    console.error(`WebSocket error for ${connection.id}:`, error);
    this.emit('error', { connectionId: connection.id, error });
  }

  // ===========================================================================
  // HTTP HANDLING
  // ===========================================================================

  private handleHttpRequest(
    req: IncomingMessage,
    res: import('http').ServerResponse,
  ): void {
    // Basic health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        connections: this.connections.size,
      }));
      return;
    }

    // 404 for everything else
    res.writeHead(404);
    res.end('Not Found');
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private sendError(connection: WebConnection, message: string): void {
    this.sendToConnection(connection.id, {
      type: 'error',
      id: uuidv4(),
      payload: { message },
      timestamp: Date.now(),
    });
  }

  private queueMessage(connection: WebConnection, message: WebSocketMessage): void {
    connection.messageQueue.push(message);

    // Trim queue if too large
    while (connection.messageQueue.length > this.config.messageQueueSize) {
      connection.messageQueue.shift();
    }
  }

  private flushMessageQueue(connection: WebConnection): void {
    while (connection.messageQueue.length > 0) {
      const message = connection.messageQueue.shift()!;
      this.sendToConnection(connection.id, message);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();

      for (const [connectionId, connection] of this.connections) {
        // Check for stale connections
        const inactiveMs = now - connection.lastActivity.getTime();

        if (inactiveMs > this.config.pingIntervalMs * 3) {
          // Connection is stale, close it
          connection.socket.close(4000, 'Connection timeout');
          continue;
        }

        // Send ping
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.ping();
        }
      }
    }, this.config.pingIntervalMs);
  }

  private async defaultAuthHandler(token: string): Promise<SecurityContext | null> {
    // Default implementation - should be overridden
    return {
      userId: 'anonymous',
      tenantId: 'default',
      roles: ['viewer'],
      clearanceLevel: 'UNCLASSIFIED',
      sessionId: uuidv4(),
      mfaVerified: false,
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  async close(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      connection.socket.close(1001, 'Server shutting down');
    }

    // Close WebSocket server
    this.wss.close();

    // Close HTTP server if we created it
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createWebAdapter(config: WebAdapterConfig): WebAdapter {
  return new WebAdapter(config);
}
