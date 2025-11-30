/**
 * Streaming API Type Definitions
 */

import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';

// ===== WebSocket Types =====

export interface WebSocketMessage {
  type: string;
  id?: string;
  data?: any;
  timestamp?: string;
  error?: StreamError;
}

export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>;
  metadata: ConnectionMetadata;
}

export interface ConnectionMetadata {
  userId?: string;
  sessionId?: string;
  connectedAt: Date;
  lastActivity: Date;
  ip?: string;
  userAgent?: string;
}

// ===== SSE Types =====

export interface SSEMessage {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

export interface SSEConnection {
  id: string;
  response: any; // Express Response
  subscriptions: Set<string>;
  metadata: ConnectionMetadata;
}

// ===== Stream Types =====

export interface StreamOptions {
  topic: string;
  filter?: StreamFilter;
  backpressure?: BackpressureOptions;
  reconnect?: ReconnectOptions;
  authentication?: AuthenticationOptions;
}

export interface StreamFilter {
  fields?: string[];
  where?: Record<string, any>;
  includeHistory?: boolean;
  historyLimit?: number;
}

export interface BackpressureOptions {
  enabled: boolean;
  highWaterMark?: number;
  strategy?: 'drop' | 'buffer' | 'throttle';
  bufferSize?: number;
}

export interface ReconnectOptions {
  enabled: boolean;
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export interface AuthenticationOptions {
  token?: string;
  apiKey?: string;
  userId?: string;
}

// ===== Event Types =====

export interface StreamEvent {
  id: string;
  topic: string;
  type: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface StreamError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

// ===== Subscription Types =====

export interface Subscription {
  id: string;
  topic: string;
  filter?: StreamFilter;
  createdAt: Date;
  messageCount: number;
}

// ===== Message Types =====

export type ClientMessage =
  | SubscribeMessage
  | UnsubscribeMessage
  | AckMessage
  | PingMessage
  | QueryMessage;

export interface SubscribeMessage {
  type: 'subscribe';
  id: string;
  topic: string;
  filter?: StreamFilter;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  id: string;
  topic: string;
}

export interface AckMessage {
  type: 'ack';
  messageId: string;
}

export interface PingMessage {
  type: 'ping';
  timestamp: number;
}

export interface QueryMessage {
  type: 'query';
  id: string;
  query: string;
  stream?: boolean;
}

export type ServerMessage =
  | DataMessage
  | ErrorMessage
  | AckResponseMessage
  | PongMessage
  | QueryResultMessage;

export interface DataMessage {
  type: 'data';
  subscriptionId: string;
  event: StreamEvent;
}

export interface ErrorMessage {
  type: 'error';
  error: StreamError;
  subscriptionId?: string;
}

export interface AckResponseMessage {
  type: 'ack_response';
  messageId: string;
  status: 'success' | 'error';
}

export interface PongMessage {
  type: 'pong';
  timestamp: number;
}

export interface QueryResultMessage {
  type: 'query_result';
  queryId: string;
  data: any;
  complete: boolean;
  cursor?: string;
}

// ===== Protocol Types =====

export interface ProtocolVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface HandshakeMessage {
  type: 'handshake';
  version: ProtocolVersion;
  authentication?: AuthenticationOptions;
  capabilities?: string[];
}

export interface HandshakeResponse {
  type: 'handshake_response';
  status: 'accepted' | 'rejected';
  version: ProtocolVersion;
  sessionId: string;
  error?: StreamError;
}

// ===== Statistics Types =====

export interface StreamStatistics {
  connections: number;
  subscriptions: number;
  messagesPerSecond: number;
  bytesPerSecond: number;
  errorRate: number;
  avgLatency: number;
}

export interface ConnectionStatistics {
  id: string;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  subscriptions: number;
  uptime: number;
  lastActivity: Date;
}
